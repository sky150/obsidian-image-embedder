import { isImageUrl, getUrlFromClipboard } from '../main';

describe('URL Validation', () => {
	describe('isImageUrl', () => {
		it('should identify valid image URLs', () => {
			const validImageUrls = [
				'https://example.com/image.jpg',
				'https://example.com/image.png',
				'https://example.com/image.gif',
				'https://example.com/image.webp',
				'https://example.com/image.svg',
				'https://example.com/image.bmp',
				'https://example.com/image.tiff'
			];

			validImageUrls.forEach(url => {
				expect(isImageUrl(url)).toBe(true);
			});
		});

		it('should identify DuckDuckGo external content proxy URLs', () => {
			const ddgUrls = [
				'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.zooplus.de%2Fmagazin%2Fwp-content%2Fuploads%2F2023%2F07%2FAdobeStock_269203044.webp&f=1&nofb=1&ipt=b46de548b5258dcbd54b763e63a15ce0d88b65570f10cb0a5407f233bafedeeb',
				'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fexample.com%2Fphoto.jpg',
				'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn.example.com%2Fimg.png&f=1',
			];

			ddgUrls.forEach(url => {
				expect(isImageUrl(url)).toBe(true);
			});
		});

		it('should identify URLs with image URLs in generic query parameters', () => {
			const proxyUrls = [
				'https://proxy.example.com/redirect?url=https://cdn.example.com/image.webp',
				'https://example.com/view?img=https://images.example.com/photo.gif',
				'https://example.com/resize?src=https://cdn.example.com/thumbnail.jpg&w=200',
			];

			proxyUrls.forEach(url => {
				expect(isImageUrl(url)).toBe(true);
			});
		});

		it('should reject DuckDuckGo URLs with non-image targets', () => {
			const nonImageDdgUrls = [
				'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fexample.com%2Fpage.html',
				'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fexample.com',
			];

			nonImageDdgUrls.forEach(url => {
				expect(isImageUrl(url)).toBe(false);
			});
		});

		it('should reject proxied URLs where inner URL is not an image', () => {
			const nonImageProxyUrls = [
				'https://example.com/page?url=https://example.com/document.pdf',
				'https://example.com/view?src=https://example.com/file.js',
			];

			nonImageProxyUrls.forEach(url => {
				expect(isImageUrl(url)).toBe(false);
			});
		});

		it('should reject non-image URLs', () => {
			const nonImageUrls = [
				'https://example.com/page.html',
				'https://example.com/document.pdf',
				'https://example.com/script.js',
				'https://example.com',
				'not-a-url',
				'http://invalid-url'
			];

			nonImageUrls.forEach(url => {
				expect(isImageUrl(url)).toBe(false);
			});
		});
	});

	describe('getUrlFromClipboard', () => {
		it('should extract valid URLs from clipboard data', () => {
			const mockClipboardData = {
				getData: (format: string) => {
					if (format === 'text/plain') {
						return 'https://example.com/image.jpg';
					}
					return '';
				}
			} as DataTransfer;

			const url = getUrlFromClipboard(mockClipboardData);
			expect(url).toBe('https://example.com/image.jpg');
		});

		it('should return null for invalid clipboard data', () => {
			const mockClipboardData = {
				getData: (format: string) => {
					if (format === 'text/plain') {
						return 'not-a-url';
					}
					return '';
				}
			} as DataTransfer;

			const url = getUrlFromClipboard(mockClipboardData);
			expect(url).toBeNull();
		});

		it('should return null for null clipboard data', () => {
			const url = getUrlFromClipboard(null);
			expect(url).toBeNull();
		});
	});
}); 