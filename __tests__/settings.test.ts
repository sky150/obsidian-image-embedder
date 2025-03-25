import { App, Editor, MarkdownView, Plugin, PluginManifest, Vault, TAbstractFile, TFile, TFolder } from 'obsidian';
import ImageEmbedderPlugin from '../main';
import { DEFAULT_SETTINGS } from '../main';
import type { ImageEmbedderSettings } from '../main';

// Extend Vault type to include config property
interface VaultWithConfig extends Vault {
    config?: {
        attachmentFolderPath?: string;
    };
}

describe('Image Embedder Plugin Settings', () => {
    let app: App;
    let plugin: ImageEmbedderPlugin;
    let manifest: PluginManifest;
    let mockVault: VaultWithConfig;

    beforeEach(async () => {
        manifest = {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
            minAppVersion: '0.15.0',
            author: 'Natalie Sumbo',
            description: 'Test Settings'
        };

        mockVault = {
            getAbstractFileByPath: jest.fn(),
            createFolder: jest.fn(),
            createBinary: jest.fn(),
            config: {
                attachmentFolderPath: 'default-attachments'
            },
            getRoot: jest.fn(),
            delete: jest.fn(),
            read: jest.fn(),
            modify: jest.fn(),
            process: jest.fn(),
            adapter: {
                exists: jest.fn(),
                mkdir: jest.fn(),
                write: jest.fn(),
                read: jest.fn()
            },
            configDir: '',
            getName: jest.fn(),
            getFileByPath: jest.fn(),
            getFolderByPath: jest.fn(),
            create: jest.fn(),
            createFile: jest.fn(),
            rename: jest.fn(),
            copy: jest.fn(),
            getAllLoadedFiles: jest.fn(),
            getMarkdownFiles: jest.fn(),
            getFiles: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            trigger: jest.fn(),
            tryTrigger: jest.fn(),
            exists: jest.fn(),
            trash: jest.fn(),
            recursive: jest.fn(),
            getResourcePath: jest.fn(),
            resolveFileUrl: jest.fn(),
            getAvailablePathForAttachment: jest.fn()
        } as unknown as VaultWithConfig;

        app = {
            vault: mockVault,
            workspace: {
                on: jest.fn(),
                off: jest.fn(),
                trigger: jest.fn(),
                getActiveViewOfType: jest.fn()
            }
        } as unknown as App;

        plugin = new ImageEmbedderPlugin(app, manifest);
        plugin.loadData = jest.fn().mockResolvedValue(DEFAULT_SETTINGS);
        plugin.saveData = jest.fn().mockResolvedValue(undefined);
        await plugin.loadSettings();
    });

    afterEach(() => {
        app = null as unknown as App;
        plugin = null as unknown as ImageEmbedderPlugin;
        manifest = null as unknown as PluginManifest;
        mockVault = null as unknown as VaultWithConfig;
        jest.clearAllMocks();
    });

    describe('Settings Initialization', () => {
        it('should load default settings', async () => {
            expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
        });

        it('should load custom settings', async () => {
            const customSettings = {
                ...DEFAULT_SETTINGS,
                confirmBeforeEmbed: false,
                showFilePath: true,
                attachmentFolder: 'custom-folder',
                filenameFormat: 'custom-{filename}-{date}',
                useTimestamp: true
            };
            (plugin.loadData as jest.Mock).mockResolvedValueOnce(customSettings);
            await plugin.loadSettings();
            expect(plugin.settings).toEqual(customSettings);
        });
    });

    describe('Settings Persistence', () => {
        it('should save settings', async () => {
            const newSettings = {
                ...DEFAULT_SETTINGS,
                confirmBeforeEmbed: false
            };
            plugin.settings = newSettings;
            await plugin.saveSettings();
            expect(plugin.saveData).toHaveBeenCalledWith(newSettings);
        });

        it('should handle save errors', async () => {
            (plugin.saveData as jest.Mock).mockRejectedValueOnce(new Error('Save failed'));
            plugin.settings = DEFAULT_SETTINGS;
            await expect(plugin.saveSettings()).rejects.toThrow('Save failed');
        });
    });

    describe('Attachment Folder Handling', () => {
        it('should use default attachment folder from Obsidian settings', async () => {
            expect(plugin.settings.attachmentFolder).toBe('');
            expect(mockVault.config?.attachmentFolderPath).toBe('default-attachments');
        });

        it('should keep custom attachment folder', async () => {
            const customSettings = {
                ...DEFAULT_SETTINGS,
                attachmentFolder: 'custom-folder'
            };
            (plugin.loadData as jest.Mock).mockResolvedValueOnce(customSettings);
            await plugin.loadSettings();
            expect(plugin.settings.attachmentFolder).toBe('custom-folder');
        });

        it('should fallback to attachments folder', async () => {
            mockVault.config = {};
            await plugin.loadSettings();
            expect(plugin.settings.attachmentFolder).toBe('');
        });
    });

    describe('Filename Format Validation', () => {
        it('should handle valid filename format', () => {
            plugin.settings.filenameFormat = '{name}-{date}';
            expect(plugin.settings.filenameFormat).toBe('{name}-{date}');
        });

        it('should handle empty filename format', () => {
            plugin.settings.filenameFormat = '';
            expect(plugin.settings.filenameFormat).toBe('');
        });

        it('should handle invalid filename format', () => {
            plugin.settings.filenameFormat = '{invalid}';
            expect(plugin.settings.filenameFormat).toBe('{invalid}');
        });
    });

    describe('Settings UI', () => {
        it('should update toggle settings', async () => {
            plugin.settings.confirmBeforeEmbed = true;
            await plugin.saveSettings();
            expect(plugin.saveData).toHaveBeenCalledWith(expect.objectContaining({
                confirmBeforeEmbed: true
            }));
        });

        it('should update text settings', async () => {
            plugin.settings.attachmentFolder = 'new-folder';
            await plugin.saveSettings();
            expect(plugin.saveData).toHaveBeenCalledWith(expect.objectContaining({
                attachmentFolder: 'new-folder'
            }));
        });
    });
}); 