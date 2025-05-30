import { basename } from 'node:path';

import matter from 'gray-matter';
import * as prettier from 'prettier';
import prettierPluginXml from '@prettier/plugin-xml';
import type { FootnoteDefinition, FootnoteReference, Image, Root as MdastRoot, RootContent } from 'mdast';
import type { Nodes as HastNodes, Element as HastElement } from 'hast';
import { frontmatter } from 'micromark-extension-frontmatter';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter';
import { raw as hastRaw } from 'hast-util-raw';
import { findAndReplace } from 'mdast-util-find-and-replace';

import { gfmFootnoteFromMarkdown } from 'mdast-util-gfm-footnote';
import { gfmFootnote } from 'micromark-extension-gfm-footnote';
import {
  VolumeFrontmatter,
  type VolumeFrontmatterType,
  type VolumeMetaSchemaType,
  type VolumeToCType,
} from './schema';
import { toHast, type State } from 'mdast-util-to-hast';
import { h } from 'hastscript';
import { toHtml } from 'hast-util-to-html';
import chapterTemplate from './template/chapter';
import insertTemplate from './template/insert';
import { toString } from 'hast-util-to-string';
import formatXml from 'xml-formatter';

export function fromMarkdownToMdast(fileContent: string): MdastRoot {
  const processed = fromMarkdown(fileContent, {
    extensions: [frontmatter(['yaml']), gfmFootnote()],
    mdastExtensions: [frontmatterFromMarkdown(['yaml']), gfmFootnoteFromMarkdown()],
  });

  // Find and replace some patterns
  findAndReplace(processed, [
    [
      // replace ^^text^^ with <sup>text</sup>
      /\^[^^]+\^/g,
      // @ts-expect-error
      ($0) => {
        return {
          type: 'superText',
          children: [{ type: 'text', value: $0.slice(1, -1) }],
        };
      },
    ],
    // @ts-expect-error
    [
      /%%[^%]+%%/g,
      ($1) => {
        return {
          type: 'subText',
          children: [{ type: 'text', value: $1.slice(1, -1) }],
        };
      },
    ],
  ]);
  return processed;
}

export function extractFrontmatter(fileContent: string): {
  content: string;
  meta: VolumeFrontmatterType;
} {
  const parsed = matter(fileContent);
  const metaCheck = VolumeFrontmatter.parse(parsed.data);
  return {
    content: parsed.content,
    meta: metaCheck,
  };
}

export async function mdastToHast(
  mdastRoot: MdastRoot,
  filename: string,
  imagesReference: (src: string) => Promise<void>, // Verify image src (and add it to metadata)
  footNotesReferences: (label: string, filename: string) => { n: number; fn: string }, // Get footnotes references numbering
  footNotesDefinition: (label: string, hastNode: HastElement) => void, // Add footnotes definition to metadata
): Promise<HastNodes> {
  const collectedImages: string[] = [];
  const hastRoot = toHast(mdastRoot, {
    allowDangerousHtml: true,
    clobberPrefix: '',
    handlers: {
      footnoteDefinition: (state, node: FootnoteDefinition) => {
        const label = node.identifier;
        const ref_n = footNotesReferences(label, filename);

        const hastNode = h('p', {}, [
          h('a', {
            id: `def-${ref_n.n}`,
            'epub:type': 'footnote',
          }),
          h(
            'a',
            {
              href: `${ref_n.fn}.xhtml#${state.options.clobberPrefix ?? ''}ref-${ref_n.n}`,
            },
            [h('sup', {}, [`[${ref_n.n}]`])],
          ),
        ]);
        const childrenContent = state.all(node);
        const hastText = toString({
          type: 'root',
          children: childrenContent,
        });
        hastNode.children.push({
          type: 'text',
          value: ` ${hastText}`,
        });
        footNotesDefinition(label, hastNode);
        return undefined;
      },
      footnoteReference: (state, node: FootnoteReference) => {
        const label = node.identifier;
        const ref_n = footNotesReferences(label, filename);

        return [
          h('a', {
            id: `ref-${ref_n.n}`,
            'epub:type': 'noteref',
          }),
          h(
            'a',
            {
              href: `notes.xhtml#${state.options.clobberPrefix ?? ''}def-${ref_n.n}`,
            },
            [h('sup', {}, [`[${ref_n.n}]`])],
          ),
        ];
      },
      image: (state, node: Image) => {
        const cleanImgUrl = node.url.replace(/#\..*/, '');
        // Fixup image node src
        const baseSrc = basename(cleanImgUrl);
        const hastNode = h('img', {
          src: `../Images/${baseSrc}`,
          alt: node.alt,
          title: node.title,
        });
        // Extract the #., which is class name
        const className = node.url.match(/#\.(.*)/);
        if (className) {
          // If className is present, add it to the hastNode properties
          hastNode.properties.class = className[1];
        }

        collectedImages.push(cleanImgUrl);

        return hastNode;
      },
      thematicBreak: (state, node) => {
        return h(
          'p',
          {
            class: 'centerp diamond',
          },
          [
            h('span', { style: 'margin-left:1em; margin-right: 1em;' }, ['✻']),
            h('span', { style: 'margin-left:1em; margin-right: 1em;' }, ['✻']),
            h('span', { style: 'margin-left:1em; margin-right: 1em;' }, ['✻']),
          ],
        );
      },
      // @ts-expect-error
      superText: (state: State, node) => {
        return {
          type: 'element',
          tagName: 'sup',
          properties: {},
          children: state.all(node),
        };
      },
    },
  });

  for (const imageSrc of collectedImages) {
    await imagesReference(imageSrc);
  }

  return hastRaw(hastRoot);
}

export function hastToHtmlRaw(hastRoot: HastNodes): string {
  return toHtml(hastRoot);
}

export function hastToHtml(
  hastRoot: HastNodes,
  filename: string,
  template: 'chapter' | 'insert',
  current: VolumeToCType,
  meta: VolumeMetaSchemaType,
): string {
  const html = hastToHtmlRaw(hastRoot);

  switch (template) {
    case 'chapter': {
      return chapterTemplate(meta, html, filename);
    }
    case 'insert': {
      return insertTemplate(meta, html, filename);
    }
    default: {
      throw new Error(`Unknown template type: ${template}`);
    }
  }
}

export function splitContentAtImage(mdastRoot: MdastRoot): (MdastRoot & { fullImage?: boolean })[] {
  // Check if mdastRoot is root
  if (mdastRoot.type !== 'root') {
    throw new Error('mdastRoot is not a `root` node');
  }

  // Each children is a paragraph/heading/text
  // When it's a paragraph and the only child is an image, we split it.
  const splitChildren: (MdastRoot & { fullImage?: boolean })[] = [];
  let currentChildren: RootContent[] = [];
  for (let i = 0; i < mdastRoot.children.length; i++) {
    const child = mdastRoot.children[i]!;
    if (child.type === 'paragraph' && child.children.length === 1 && child.children[0]!.type === 'image') {
      // Get the image src
      const imageSrc = (child.children[0] as Image).url;
      // Check if this a no split
      const isNoSplit = Boolean(imageSrc.match(/\#nosplit$/));
      if (isNoSplit) {
        // If no split, remove the #nosplit from the src
        (child.children[0] as Image).url = imageSrc.replace(/\#nosplit$/, '');
      } else {
        // If split, we need to split the children
        if (currentChildren.length > 0) {
          splitChildren.push({
            type: 'root',
            children: currentChildren,
            position: {
              start: currentChildren[0]!.position!.start,
              end: currentChildren[currentChildren.length - 1]!.position!.end,
            },
          });
        }
        splitChildren.push({
          type: 'root',
          children: [...child.children],
          position: child.position,
          fullImage: true,
        });
        currentChildren = [];
        continue;
      }
    }

    currentChildren.push(child);
  }

  if (currentChildren.length > 0) {
    splitChildren.push({
      type: 'root',
      children: currentChildren,
      position: {
        start: currentChildren[0]!.position!.start,
        end: currentChildren[currentChildren.length - 1]!.position!.end,
      },
    });
  }

  return splitChildren;
}

export async function prettifyHtml(html: string): Promise<string> {
  return prettier.format(html, {
    parser: 'html',
    plugins: [prettierPluginXml],
    printWidth: 10000,
    tabWidth: 2,
    useTabs: false,
    proseWrap: 'preserve',
  });
}

export function prettifyXml(xml: string): string {
  return formatXml(xml, {
    collapseContent: true,
    indentation: '  ',
    lineSeparator: '\n',
  });
}
