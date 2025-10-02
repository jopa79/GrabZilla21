// Test setup file for vitest
import { beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'

// Create a proper DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
})

// Set up global DOM objects
global.window = dom.window
global.document = dom.window.document
global.navigator = dom.window.navigator
global.HTMLElement = dom.window.HTMLElement
global.Element = dom.window.Element
global.Node = dom.window.Node

// Mock DOM environment setup
beforeEach(() => {
  // Reset DOM before each test
  document.body.innerHTML = ''
  
  // Ensure documentElement exists and has style property
  if (!document.documentElement) {
    document.documentElement = document.createElement('html')
  }
  
  if (!document.documentElement.style) {
    document.documentElement.style = {
      setProperty: vi.fn(),
      getProperty: vi.fn(),
      removeProperty: vi.fn()
    }
  }
  
  // Add basic CSS custom properties for testing
  document.documentElement.style.setProperty('--status-ready', '#00a63e')
  document.documentElement.style.setProperty('--status-downloading', '#00a63e')
  document.documentElement.style.setProperty('--status-converting', '#155dfc')
  document.documentElement.style.setProperty('--status-completed', '#4a5565')
  document.documentElement.style.setProperty('--status-error', '#e7000b')
  
  // Mock window.electronAPI (will be overridden by individual tests)
  if (!global.window.electronAPI) {
    global.window.electronAPI = null
  }
  
  // Mock console methods to reduce noise in tests
  global.console.log = vi.fn()
  global.console.warn = vi.fn()
  global.console.error = vi.fn()
})

afterEach(() => {
  // Clean up after each test
  document.body.innerHTML = ''
  
  // Clear all mocks
  vi.clearAllMocks()
})