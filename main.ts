import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, Events, TFile } from 'obsidian';

// Remember to rename these classes and interfaces!

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

// Helper function to check if a URL is an image
export function isImageUrl(url: string): boolean {
	// Common image file extensions
	const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'];
	
	try {
		// Try to parse the URL
		const parsedUrl = new URL(url);
		// Check if the pathname ends with an image extension
		return imageExtensions.some(ext => 
			parsedUrl.pathname.toLowerCase().endsWith(ext)
		);
	} catch {
		// If URL parsing fails, it's not a valid URL
		return false;
	}
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
export function generateUserFriendlyFilename(url: string, settings: ImageEmbedderSettings): string {
	const urlObj = new URL(url);
	
	// Get the last meaningful part of the URL path
	let filename = urlObj.pathname.split('/').pop() || 'image';
	
	// Remove query parameters and hash
	filename = filename.split('?')[0].split('#')[0];
	
	// Get the extension
	const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
	
	// Remove the extension from the filename
	filename = filename.slice(0, -(extension.length + 1));
	
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
		.replace('{name}', filename)
		.replace('{timestamp}', settings.useTimestamp ? timestamp : '')
		.replace('{date}', date)
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

// Helper function to download and save image
export async function downloadAndSaveImage(app: App, url: string, folderPath: string, settings: ImageEmbedderSettings): Promise<string> {
	try {
		// Ensure attachment folder exists
		await ensureAttachmentFolder(app, folderPath);

		// Generate user-friendly filename
		const filename = generateUserFriendlyFilename(url, settings);
		const fullPath = `${folderPath}/${filename}`;

		// Download image
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to download image: ${response.statusText}`);
		}
		const arrayBuffer = await response.arrayBuffer();

		// Save to vault
		await app.vault.createBinary(fullPath, arrayBuffer);

		return fullPath;
	} catch (error) {
		console.error('Error downloading image:', error);
		throw error;
	}
}

export default class ImageEmbedderPlugin extends Plugin {
	settings: ImageEmbedderSettings;

	async onload() {
		await this.loadSettings();

		// If attachment folder is not set, get it from Obsidian settings
		if (!this.settings.attachmentFolder) {
			// @ts-ignore - Internal API
			this.settings.attachmentFolder = this.app.vault.config.attachmentFolderPath || 'attachments';
			await this.saveSettings();
		}

		// Register the paste event handler
		this.registerEvent(
			this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor, markdownView: MarkdownView) => {
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
							const buttonsDiv = notice.noticeEl.createDiv({
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
					new Notice('Failed to download and embed image. Check console for details.', 5000);
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

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		// Add title and separator
		containerEl.createEl('h1', { text: 'General Settings' });

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
