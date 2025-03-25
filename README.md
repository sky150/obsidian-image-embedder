# Image Embedder for Obsidian

A plugin for Obsidian that automatically downloads and embeds images from URLs when pasting them into your notes.

## Demo

![Demo of Image Embedder](demo.gif)

## Features

- Automatically detects image URLs when pasting
- Downloads and saves images to your vault
- Configurable attachment folder
- Customizable filename format with placeholders
- Optional confirmation before embedding
- Shows file path in success messages (optional)

## Usage

1. Copy an image URL to your clipboard
2. Paste it into your note
3. If the URL is an image, the plugin will:
   - Show a confirmation dialog (if enabled)
   - Download the image
   - Save it to your configured attachment folder
   - Insert a markdown link to the image

## Settings

- **Confirm before embedding**: Show a confirmation dialog before downloading and embedding images
- **Show file path**: Show the saved file path in the success notice
- **Attachment folder**: Folder where downloaded images will be saved (relative to vault root)
- **Filename format**: Format for saved filenames with placeholders:
  - `{name}`: Original filename
  - `{timestamp}`: ISO timestamp (if enabled)
  - `{date}`: Current date
- **Use timestamp**: Add timestamp to filenames for uniqueness

## Development

This plugin is built using the [Obsidian Plugin API](https://github.com/obsidian-community/obsidian-api).

### Building from source

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the plugin:
   ```bash
   npm run build
   ```
4. The built plugin will be in the `dist` folder

## License

MIT License - see LICENSE file for details

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/yourusername/obsidian-image-embedder/issues) on GitHub.
