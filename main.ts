import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, FileManager, requestUrl } from 'obsidian';


interface ImageEmbedderSettings {
	confirmBeforeEmbed: boolean;
	showFilePath: boolean;
	attachmentFolder: string;
	filenameFormat: string;
	useTimestamp: boolean;
}

const DEFAULT_SETTINGS: ImageEmbedderSettings = {
	confirmBeforeEmbed: true,
	showFilePath: false,
	attachmentFolder: '', // Will be set from Obsidian settings
	filenameFormat: '{name}-{timestamp}', // Available placeholders: {name}, {timestamp}, {date}
	useTimestamp: true
}

export { DEFAULT_SETTINGS };
export type { ImageEmbedderSettings };

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'];

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/jpg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/svg+xml': 'svg',
	'image/bmp': 'bmp',
	'image/tiff': 'tiff',
};

function getPathExtension(pathname: string): string | null {
	const last = pathname.split('/').pop() || '';
	const dot = last.lastIndexOf('.');
	if (dot <= 0) return null;
	const ext = last.slice(dot + 1).toLowerCase();
	return IMAGE_EXTENSIONS.includes(ext) ? ext : null;
}

// Returns the URL that actually points at the image file. For proxy URLs
// (e.g. DuckDuckGo's /iu/?u=<real-url>) this is the URL inside the query
// parameter; otherwise it is the URL itself. Returns null if no image URL is found.
export function resolveImageUrl(url: string): URL | null {
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url);
	} catch {
		return null;
	}

	if (getPathExtension(parsedUrl.pathname)) return parsedUrl;

	for (const [, value] of parsedUrl.searchParams.entries()) {
		try {
			// searchParams already decodes once; decode again for double-encoded values
			let candidate = value;
			try {
				candidate = decodeURIComponent(value);
			} catch {
				// keep the value as is
			}
			const innerUrl = new URL(candidate);
			if (getPathExtension(innerUrl.pathname)) return innerUrl;
		} catch {
			// Not a valid URL, skip
		}
	}

	return null;
}

// Helper function to check if a URL is an image
export function isImageUrl(url: string): boolean {
	return resolveImageUrl(url) !== null;
}

export function extensionFromContentType(contentType: string | undefined): string | null {
	if (!contentType) return null;
	const mime = contentType.split(';')[0].trim().toLowerCase();
	return CONTENT_TYPE_EXTENSIONS[mime] ?? null;
}

function getHeader(headers: Record<string, string> | undefined, name: string): string | undefined {
	if (!headers) return undefined;
	const key = Object.keys(headers).find(k => k.toLowerCase() === name);
	return key ? headers[key] : undefined;
}

// Helper function to extract URL from clipboard data
export function getUrlFromClipboard(clipboardData: DataTransfer | null): string | null {
	if (!clipboardData) return null;

	// Try to get URL from clipboard
	const url = clipboardData.getData('text/plain');
	if (!url) return null;

	// Basic URL validation
	try {
		new URL(url);
		return url;
	} catch {
		return null;
	}
}

// Helper function to create a user-friendly filename
export function generateUserFriendlyFilename(url: string, settings: ImageEmbedderSettings, contentType?: string): string {
	// Use the real image URL (inner URL for proxies like DuckDuckGo)
	const urlObj = resolveImageUrl(url) ?? new URL(url);

	// Get the last meaningful part of the URL path
	let filename = urlObj.pathname.split('/').pop() || 'image';

	// Prefer the type the server reports, then the URL's extension, then jpg
	const pathExtension = getPathExtension(urlObj.pathname);
	const extension = extensionFromContentType(contentType) ?? pathExtension ?? 'jpg';

	// Remove the extension from the filename
	if (pathExtension) {
		filename = filename.slice(0, filename.lastIndexOf('.'));
	}
	
	// Clean up the filename:
	// 1. Replace spaces and special characters with hyphens
	// 2. Remove multiple consecutive hyphens
	// 3. Remove leading/trailing hyphens
	filename = filename
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
	
	// If filename is empty after cleaning, use a default
	if (!filename) {
		filename = 'image';
	}

	// Generate timestamp and date if needed
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const date = new Date().toISOString().split('T')[0];
	
	// Replace placeholders in the format string
	let finalFilename = settings.filenameFormat
		.replace(/\{name\}/g, filename)
		.replace(/\{timestamp\}/g, settings.useTimestamp ? timestamp : '')
		.replace(/\{date\}/g, date)
		.replace(/-+/g, '-') // Clean up multiple consecutive hyphens
		.replace(/-+$/g, ''); // Remove trailing hyphens
	
	// If the filename is empty after replacing placeholders, use the original filename
	if (!finalFilename.trim()) {
		finalFilename = filename;
	}
	
	return `${finalFilename}.${extension}`;
}

// Helper function to ensure attachment folder exists
async function ensureAttachmentFolder(app: App, folderPath: string): Promise<string> {
	const folder = app.vault.getAbstractFileByPath(folderPath);
	if (!folder) {
		await app.vault.createFolder(folderPath);
	}
	return folderPath;
}

// Returns folder/filename, adding -1, -2, ... before the extension if that file already exists
export function getAvailablePath(app: App, folderPath: string, filename: string): string {
	const folder = folderPath.replace(/^\/+|\/+$/g, '');
	const prefix = folder ? `${folder}/` : '';
	const dot = filename.lastIndexOf('.');
	const base = dot > 0 ? filename.slice(0, dot) : filename;
	const ext = dot > 0 ? filename.slice(dot) : '';

	let candidate = `${prefix}${filename}`;
	let counter = 1;
	while (app.vault.getAbstractFileByPath(candidate)) {
		candidate = `${prefix}${base}-${counter}${ext}`;
		counter++;
	}
	return candidate;
}

// Helper function to download and save image
export async function downloadAndSaveImage(app: App, url: string, folderPath: string, settings: ImageEmbedderSettings): Promise<string> {
	// Ensure attachment folder exists
	await ensureAttachmentFolder(app, folderPath);

	// Download image
	const response = await requestUrl({ url, throw: false });
	if (response.status >= 400) {
		throw new Error(`Failed to download image: ${response.status}`);
	}
	const arrayBuffer = response.arrayBuffer;

	// Generate user-friendly filename, using the server's content type for the extension
	const filename = generateUserFriendlyFilename(url, settings, getHeader(response.headers, 'content-type'));
	const fullPath = getAvailablePath(app, folderPath, filename);

	// Save to vault
	await app.vault.createBinary(fullPath, arrayBuffer);

	return fullPath;
}

export default class ImageEmbedderPlugin extends Plugin {
	settings: ImageEmbedderSettings;
	app: App & { fileManager: FileManager };

	async onload() {
		await this.loadSettings();

		// If attachment folder is not set, get it from Obsidian settings
		if (!this.settings.attachmentFolder) {
			// Use the official API to get the attachment folder path
			const defaultAttachmentPath = await this.app.fileManager.getAvailablePathForAttachment('', '');
			this.settings.attachmentFolder = defaultAttachmentPath.split('/')[0] || 'attachments';
			await this.saveSettings();
		}

		// Register the paste event handler
		this.registerEvent(
			this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor, markdownView: MarkdownView) => {
				// Respect handlers that have already handled this event
				if (evt.defaultPrevented) return;

				// Get the URL from clipboard
				const url = getUrlFromClipboard(evt.clipboardData);
				if (!url) return; // Not a URL, let the default paste behavior happen

				// Check if it's an image URL
				if (!isImageUrl(url)) return; // Not an image URL, let the default paste behavior happen

				// Prevent the default paste behavior
				evt.preventDefault();

				try {
					// Show confirmation dialog if enabled
					if (this.settings.confirmBeforeEmbed) {
						const confirmed = await new Promise<boolean>((resolve) => {
							const notice = new Notice('Download and embed this image?', 0);
							const buttonsDiv = notice.containerEl.createDiv({
								cls: 'notice-buttons'
							});
							
							buttonsDiv.createEl('button', {
								text: 'Yes',
								cls: 'mod-cta'
							}).addEventListener('click', () => {
								notice.hide();
								resolve(true);
							});
							
							buttonsDiv.createEl('button', {
								text: 'No'
							}).addEventListener('click', () => {
								notice.hide();
								resolve(false);
							});
						});

						if (!confirmed) {
							// We prevented the normal paste, so paste the URL as plain text
							editor.replaceSelection(url);
							return;
						}
					}

					// Download and save the image
					const savedPath = await downloadAndSaveImage(this.app, url, this.settings.attachmentFolder, this.settings);

					// Create the markdown link
					const markdownLink = `![[${savedPath}]]`;
					
					// Insert the markdown link at cursor position
					editor.replaceSelection(markdownLink);

					// Show success message
					const message = this.settings.showFilePath
						? `Image saved and embedded: ${savedPath}`
						: 'Image saved and embedded successfully!';
					new Notice(message, 3000);
				} catch (error) {
					console.error('Error processing image:', error);
					// Don't lose what the user pasted
					editor.replaceSelection(url);
					new Notice('Failed to download image, pasted the URL instead. Check console for details.', 5000);
				}
			})
		);

		// Add settings tab
		this.addSettingTab(new ImageEmbedderSettingTab(this.app, this));
	}

	onunload() {
		// Clean up any resources if needed
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ImageEmbedderSettingTab extends PluginSettingTab {
	plugin: ImageEmbedderPlugin;

	constructor(app: App, plugin: ImageEmbedderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): Record<string, { type: string; default: unknown; title: string; description: string }> {
		return {
			confirmBeforeEmbed: {
				type: 'boolean',
				default: DEFAULT_SETTINGS.confirmBeforeEmbed,
				title: 'Confirm before embedding',
				description: 'Show a confirmation dialog before downloading and embedding images'
			},
			showFilePath: {
				type: 'boolean',
				default: DEFAULT_SETTINGS.showFilePath,
				title: 'Show file path',
				description: 'Show the saved file path in the success notice'
			},
			attachmentFolder: {
				type: 'text',
				default: DEFAULT_SETTINGS.attachmentFolder,
				title: 'Attachment folder',
				description: 'Folder where downloaded images will be saved (relative to vault root). Leave empty to use Obsidian\'s default attachment folder.'
			},
			filenameFormat: {
				type: 'text',
				default: DEFAULT_SETTINGS.filenameFormat,
				title: 'Filename format',
				description: 'Format for saved filenames. Available placeholders: {name}, {timestamp}, {date}'
			},
			useTimestamp: {
				type: 'boolean',
				default: DEFAULT_SETTINGS.useTimestamp,
				title: 'Use timestamp',
				description: 'Add timestamp to filenames for uniqueness'
			}
		};
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		// Add title and separator
		
		new Setting(containerEl)
			.setName('Confirm before embedding')
			.setDesc('Show a confirmation dialog before downloading and embedding images')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.confirmBeforeEmbed)
				.onChange(async (value) => {
					this.plugin.settings.confirmBeforeEmbed = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show file path')
			.setDesc('Show the saved file path in the success notice')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.showFilePath)
				.onChange(async (value) => {
					this.plugin.settings.showFilePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Attachment folder')
			.setDesc('Folder where downloaded images will be saved (relative to vault root). Leave empty to use Obsidian\'s default attachment folder.')
			.addText((text) => text
				.setPlaceholder('Use Obsidian default')
				.setValue(this.plugin.settings.attachmentFolder)
				.onChange(async (value) => {
					this.plugin.settings.attachmentFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Filename format')
			.setDesc('Format for saved filenames. Available placeholders: {name}, {timestamp}, {date}')
			.addText((text) => text
				.setPlaceholder('{name}-{timestamp}')
				.setValue(this.plugin.settings.filenameFormat)
				.onChange(async (value) => {
					this.plugin.settings.filenameFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Use timestamp')
			.setDesc('Add timestamp to filenames for uniqueness')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.useTimestamp)
				.onChange(async (value) => {
					this.plugin.settings.useTimestamp = value;
					await this.plugin.saveSettings();
				}));
	}
}
