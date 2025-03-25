import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, Events } from 'obsidian';

// Remember to rename these classes and interfaces!

interface ImageEmbedderSettings {
	confirmBeforeEmbed: boolean;
	showFilePath: boolean;
	attachmentFolder: string;
}

const DEFAULT_SETTINGS: ImageEmbedderSettings = {
	confirmBeforeEmbed: true,
	showFilePath: false,
	attachmentFolder: 'attachments'
}

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

export default class ImageEmbedderPlugin extends Plugin {
	settings: ImageEmbedderSettings;

	async onload() {
		await this.loadSettings();

		// Register the paste event handler
		this.registerEvent(
			this.app.workspace.on('editor-paste', (evt: ClipboardEvent, editor: Editor, markdownView: MarkdownView) => {
				// Get the URL from clipboard
				const url = getUrlFromClipboard(evt.clipboardData);
				if (!url) return; // Not a URL, let the default paste behavior happen

				// Check if it's an image URL
				if (!isImageUrl(url)) return; // Not an image URL, let the default paste behavior happen

				// Prevent the default paste behavior
				evt.preventDefault();

				// Log for debugging
				console.log('Image URL detected:', url);

				// TODO: We'll implement the download and embed logic in the next step
				new Notice('Image URL detected! Download and embed coming soon...');
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
			.setDesc('Folder where downloaded images will be saved (relative to vault root)')
			.addText((text) => text
				.setPlaceholder('attachments')
				.setValue(this.plugin.settings.attachmentFolder)
				.onChange(async (value) => {
					this.plugin.settings.attachmentFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}
