import { App, Editor, MarkdownView, Notice, Plugin, PluginManifest } from 'obsidian';
import ImageEmbedderPlugin from '../main';

// Mock the Notice class and Plugin class
jest.mock('obsidian', () => {
    const originalModule = jest.requireActual('obsidian');
    
    class MockPlugin {
        app: App;
        manifest: PluginManifest;
        
        constructor(app: App, manifest: PluginManifest) {
            this.app = app;
            this.manifest = manifest;
        }
        
        registerEvent = jest.fn();
        loadData = jest.fn().mockResolvedValue({});
        saveData = jest.fn().mockResolvedValue(undefined);
        addSettingTab = jest.fn();
    }
    
    return {
        ...originalModule,
        Notice: jest.fn().mockImplementation((text, duration = 0) => {
            const containerEl = {
                createDiv: jest.fn().mockReturnValue({
                    createEl: jest.fn().mockReturnValue({
                        addEventListener: jest.fn().mockImplementation((event, callback) => {
                            // Simulate clicking the button immediately for testing
                            if (event === 'click' && text === 'Download and embed this image?') {
                                callback();
                            }
                        })
                    })
                })
            };
            return {
                text,
                duration,
                containerEl,
                hide: jest.fn()
            };
        }),
        Plugin: MockPlugin
    };
});

// Mock global fetch
global.fetch = jest.fn().mockImplementation((url) => {
    if (url === 'https://example.com/image.jpg') {
        return Promise.resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
        });
    }
    return Promise.resolve({
        ok: false,
        statusText: 'Not Found'
    });
});

describe('Notifications and Confirmation Dialog', () => {
    let plugin: ImageEmbedderPlugin;
    let mockApp: App;
    let mockEditor: Editor;
    let mockMarkdownView: MarkdownView;
    let mockWorkspace: any;
    let registeredHandler: Function;

    beforeEach(async () => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock workspace with event registration capture
        mockWorkspace = {
            on: jest.fn().mockImplementation((event, handler) => {
                if (event === 'editor-paste') {
                    registeredHandler = handler;
                }
                return {};
            })
        };

        // Create mock objects
        mockApp = {
            vault: {
                config: {
                    attachmentFolderPath: 'attachments'
                },
                createBinary: jest.fn().mockResolvedValue(undefined),
                getAbstractFileByPath: jest.fn().mockReturnValue(null),
                createFolder: jest.fn().mockResolvedValue(undefined)
            },
            workspace: mockWorkspace
        } as unknown as App;

        mockEditor = {
            replaceSelection: jest.fn()
        } as unknown as Editor;

        mockMarkdownView = {} as MarkdownView;

        // Create plugin instance with mock manifest
        const mockManifest: PluginManifest = {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
            minAppVersion: '0.15.0',
            author: 'Test Author',
            description: 'Test Description'
        };
        plugin = new ImageEmbedderPlugin(mockApp, mockManifest);

        // Mock loadData and saveData
        plugin.loadData = jest.fn().mockResolvedValue({});
        plugin.saveData = jest.fn().mockResolvedValue(undefined);
        
        // Initialize settings
        plugin.settings = {
            confirmBeforeEmbed: true,
            showFilePath: false,
            attachmentFolder: 'attachments',
            filenameFormat: '{name}-{timestamp}',
            useTimestamp: true
        };

        // Set app property
        Object.defineProperty(plugin, 'app', {
            get: () => mockApp
        });

        // Mock loadSettings
        plugin.loadSettings = jest.fn().mockImplementation(async () => {
            plugin.settings = {
                confirmBeforeEmbed: true,
                showFilePath: false,
                attachmentFolder: 'attachments',
                filenameFormat: '{name}-{timestamp}',
                useTimestamp: true
            };
        });

        // Load the plugin to register event handlers
        await plugin.onload();
    });

    describe('Confirmation Dialog', () => {
        it('should show confirmation dialog when confirmBeforeEmbed is true', async () => {
            // Set up settings
            plugin.settings.confirmBeforeEmbed = true;

            // Create a mock clipboard event
            const mockClipboardEvent = {
                clipboardData: {
                    getData: jest.fn().mockReturnValue('https://example.com/image.jpg')
                },
                preventDefault: jest.fn()
            };

            // Simulate the paste event
            await registeredHandler(mockClipboardEvent, mockEditor, mockMarkdownView);

            // Verify that Notice was called with the correct parameters
            expect(Notice).toHaveBeenNthCalledWith(1, 'Download and embed this image?', 0);
            expect(Notice).toHaveBeenNthCalledWith(2, 'Image saved and embedded successfully!', 3000);
        }, 10000); // Increase timeout to 10 seconds

        it('should not show confirmation dialog when confirmBeforeEmbed is false', async () => {
            // Set up settings
            plugin.settings.confirmBeforeEmbed = false;

            // Create a mock clipboard event
            const mockClipboardEvent = {
                clipboardData: {
                    getData: jest.fn().mockReturnValue('https://example.com/image.jpg')
                },
                preventDefault: jest.fn()
            };

            // Simulate the paste event
            await registeredHandler(mockClipboardEvent, mockEditor, mockMarkdownView);

            // Verify that Notice was not called for confirmation
            expect(Notice).not.toHaveBeenCalledWith('Download and embed this image?', 0);
            expect(Notice).toHaveBeenCalledWith('Image saved and embedded successfully!', 3000);
        });
    });

    describe('Success Notifications', () => {
        it('should show success notification with file path when showFilePath is true', async () => {
            // Set up settings
            plugin.settings.showFilePath = true;
            plugin.settings.confirmBeforeEmbed = false;

            // Mock fetch
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
            });

            // Create a mock clipboard event
            const mockClipboardEvent = {
                clipboardData: {
                    getData: jest.fn().mockReturnValue('https://example.com/image.jpg')
                },
                preventDefault: jest.fn()
            };

            // Simulate the paste event
            await registeredHandler(mockClipboardEvent, mockEditor, mockMarkdownView);

            // Verify that Notice was called with the correct parameters
            expect(Notice).toHaveBeenCalledWith(
                expect.stringContaining('Image saved and embedded:'),
                3000
            );
        });

        it('should show success notification without file path when showFilePath is false', async () => {
            // Set up settings
            plugin.settings.showFilePath = false;
            plugin.settings.confirmBeforeEmbed = false;

            // Mock fetch
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
            });

            // Create a mock clipboard event
            const mockClipboardEvent = {
                clipboardData: {
                    getData: jest.fn().mockReturnValue('https://example.com/image.jpg')
                },
                preventDefault: jest.fn()
            };

            // Simulate the paste event
            await registeredHandler(mockClipboardEvent, mockEditor, mockMarkdownView);

            // Verify that Notice was called with the correct parameters
            expect(Notice).toHaveBeenCalledWith(
                'Image saved and embedded successfully!',
                3000
            );
        });
    });

    describe('Error Notifications', () => {
        it('should show error notification when download fails', async () => {
            // Set up settings
            plugin.settings.confirmBeforeEmbed = false;

            // Mock fetch to simulate a failed download
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                statusText: 'Not Found'
            });

            // Create a mock clipboard event
            const mockClipboardEvent = {
                clipboardData: {
                    getData: jest.fn().mockReturnValue('https://example.com/image.jpg')
                },
                preventDefault: jest.fn()
            };

            // Simulate the paste event
            await registeredHandler(mockClipboardEvent, mockEditor, mockMarkdownView);

            // Verify that Notice was called with the error message
            expect(Notice).toHaveBeenCalledWith(
                'Failed to download and embed image. Check console for details.',
                5000
            );
        });
    });
}); 