import { App, requestUrl } from 'obsidian';
import {
	downloadAndSaveImage,
	generateUserFriendlyFilename,
	getAvailablePath,
	extensionFromContentType,
	ImageEmbedderSettings,
} from '../main';

const settings: ImageEmbedderSettings = {
	confirmBeforeEmbed: false,
	showFilePath: false,
	attachmentFolder: 'attachments',
	filenameFormat: '{name}',
	useTimestamp: false,
};

function makeApp(existing: string[] = []) {
	const files = new Set(existing);
	const vault = {
		getAbstractFileByPath: jest.fn((p: string) => (files.has(p) ? { path: p } : null)),
		createFolder: jest.fn(),
		createBinary: jest.fn(async (p: string) => { files.add(p); }),
	};
	return { app: { vault } as unknown as App, vault };
}

describe('bug fixes', () => {
	beforeEach(() => {
		(requestUrl as jest.Mock).mockReset();
		(requestUrl as jest.Mock).mockResolvedValue({
			status: 200,
			headers: { 'Content-Type': 'image/png' },
			arrayBuffer: new ArrayBuffer(0),
		});
	});

	it('does not overwrite or fail when the file already exists', async () => {
		const { app, vault } = makeApp(['attachments/attachments']);
		vault.getAbstractFileByPath.mockImplementation((p: string) =>
			['attachments', 'attachments/photo.png'].includes(p) ? { path: p } : null);
		const first = await downloadAndSaveImage(app, 'https://example.com/photo.png', 'attachments', settings);
		expect(first).toBe('attachments/photo-1.png');
	});

	it('pasting the same image twice gives two different files', async () => {
		const { app } = makeApp(['attachments']);
		const a = await downloadAndSaveImage(app, 'https://example.com/photo.png', 'attachments', settings);
		const b = await downloadAndSaveImage(app, 'https://example.com/photo.png', 'attachments', settings);
		expect(a).toBe('attachments/photo.png');
		expect(b).toBe('attachments/photo-1.png');
	});

	it('getAvailablePath handles a root/empty folder', () => {
		const { app } = makeApp();
		expect(getAvailablePath(app, '', 'x.png')).toBe('x.png');
		expect(getAvailablePath(app, '/', 'x.png')).toBe('x.png');
	});

	it('uses the server content type for the extension', () => {
		const name = generateUserFriendlyFilename('https://example.com/photo.jpg', settings, 'image/webp; charset=binary');
		expect(name).toBe('photo.webp');
	});

	it('names DuckDuckGo proxy images after the real image, not "image.iu"', () => {
		const url = 'https://external-content.duckduckgo.com/iu/?u=' +
			encodeURIComponent('https://cdn.example.com/dogs/golden-retriever.jpeg') + '&f=1';
		expect(generateUserFriendlyFilename(url, settings)).toBe('golden-retriever.jpeg');
	});

	it('replaces every occurrence of a placeholder', () => {
		const name = generateUserFriendlyFilename('https://example.com/cat.png', { ...settings, filenameFormat: '{name}_{name}' });
		expect(name).toBe('cat_cat.png');
	});

	it('maps content types', () => {
		expect(extensionFromContentType('image/jpeg')).toBe('jpg');
		expect(extensionFromContentType('text/html')).toBeNull();
		expect(extensionFromContentType(undefined)).toBeNull();
	});
});
