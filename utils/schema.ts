import { z } from 'zod';

const TemplateSupport = z
  .enum(['toc-simple', 'footnotes', 'images', 'cover', 'chapter', 'afterword', 'colophon'])
  .default('chapter');
const TocType = z.enum(['frontmatter', 'chapter', 'backmatter']);
const NumberingType = z.enum(['padzero', 'underscore']).default('underscore');

const VolumeToC = z.object({
  title: z.string(),
  type: TocType,
  filename: z.string(),
  landmark: z.string().optional(),
  numbering: NumberingType.optional(),
  optional: z.boolean().default(false),
});

const VolumeMetaSchema = z.object({
  title: z.string(),
  volume: z.number().min(1),
  identifier: z.string(),
  cover: z.string(),
  year: z.number(),
  version: z.string(),
  toc: z.array(VolumeToC).superRefine((toc, ctx) => {
    // Check for duplicates filename
    const filenames = new Set<string>();
    for (const item of toc) {
      if (filenames.has(item.filename)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate filename found: ${item.filename}`,
        });
      }
      filenames.add(item.filename);
    }
  }),
});

const VolumeFrontmatter = z.object({
  template: TemplateSupport,
  numbering: NumberingType.optional(),
  toc: z.boolean().default(false),
});

const ProjectMetaSchema = z.object({
  title: z.string(),
  publisher: z.object({
    name: z.string(),
    country: z.string(),
  }),
  author: z.object({
    writer: z.string(),
    illustrator: z.string().optional(),
  }),
  translator: z.object({
    name: z.string(),
    url: z.string().url().optional(),
    image: z.string().nullable().optional(),
  }),
  compiler: z.object({
    name: z.string(),
    url: z.string().url().optional(),
  }),
  teams: z.array(
    z.object({
      name: z.string(),
      role: z.enum(['translator', 'proofreader', 'editor', 'lettering', 'designer', 'quality-checker']),
    }),
  ),
});

export type VolumeToCType = z.infer<typeof VolumeToC>;
export type TemplateSupportType = z.infer<typeof TemplateSupport>;
export type NumberingTypeType = z.infer<typeof NumberingType>;
export type VolumeMetaSchemaType = z.infer<typeof VolumeMetaSchema>;
export type VolumeFrontmatterType = z.infer<typeof VolumeFrontmatter>;
export type ProjectMetaSchemaType = z.infer<typeof ProjectMetaSchema>;

export { VolumeMetaSchema, VolumeToC, VolumeFrontmatter, ProjectMetaSchema };
