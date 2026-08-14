import '@testing-library/jest-dom/vitest';

// jsdom не реализует matchMedia/ResizeObserver/scrollIntoView, а Mantine их
// использует. Моки по гайду https://mantine.dev/guides/vitest/
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;

window.HTMLElement.prototype.scrollIntoView = () => {};
