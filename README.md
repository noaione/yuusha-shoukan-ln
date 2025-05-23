# The "Yuusha Shoukan" Fan TL Compilation Project

A fan translation compilation project, based on translation done by [Foxaholic](https://www.foxaholic.com/novel/yuushou-ln/).

Commonly known as `Yuusha Shoukan ni Makikomareta kedo, Isekai wa Heiwa deshita` commonly known in English as `I was Caught up in a Hero Summoning, but that World is at Peace` or officialy as `I Got Caught Up in a Hero Summons, but the Other World Was at Peace!`

The LN illustration are not included in this repository, you can purchase it yourself from the Japanese publisher.

See progress at [PROGRESS.md](PROGRESS.md).

## Generating the EPUB
### Requirements
- Bun (https://bun.sh/)

### Usage
1. Clone the repository to your local machine.
2. Install the dependencies:
   ```bash
   bun install
   ```
3. Add the images to the `_Images` folder, it should be organized the same as the `sources` folder.
4. Generate the EPUB file:
   ```bash
   bun run index.ts
   ```
5. The EPUB file will be generated in the `_Final` directory.

## Changes from the Original
- Fixed some stutters (If I managed to catch it)
- Changed Banginterro (!?) into Interrobang (?!)
- Move TL Notes as Footnotes, and remove the more obvious one.
- Changed some excessive em/en-dash `———-` -> `—`
- Changed excessive ellipsis `……` -> `...`
- Adjust some weird use of spacing, punctuation, missing bracket, etc.
- Minor adjustment to some sentences.

## License

None, although the generation code is licensed under the MIT License. See the [LICENSE-CODE](LICENSE-CODE) file for more information.

## Thanks!
- [Foxaholic](https://www.foxaholic.com/novel/yuushou-ln/) for the original translation
- [`smoores/epub`](https://www.npmjs.com/package/@smoores/epub) for the EPUB generation tooling
  - The following library has been patched to fix some issues regarding package generation.
- All the used `hast`, `mdast`, `micromark`, `unist` utils.
  - Used the more lower-level libraries to convert the markdown.
  - Also `gray-matter` for the frontmatter extractor.
- [`prettier`](https://prettier.io/) and [`xml-formatter`](https://www.npmjs.com/package/xml-formatter) for the prettier/formatter.
