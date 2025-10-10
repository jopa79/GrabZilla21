/**
 * Clipboard Monitoring Consent Dialog
 *
 * Displays a modal dialog requesting user consent before enabling clipboard monitoring.
 * Complies with privacy best practices by providing clear disclosure.
 */

class ClipboardConsentDialog {
    constructor() {
        this.dialog = null;
        this.overlay = null;
        this.onAllow = null;
        this.onDeny = null;
    }

    /**
     * Show the consent dialog
     * @returns {Promise<{allowed: boolean, rememberChoice: boolean}>}
     */
    show() {
        return new Promise((resolve) => {
            this.createDialog();

            // Set up button handlers
            const allowBtn = this.dialog.querySelector('#clipboard-consent-allow');
            const denyBtn = this.dialog.querySelector('#clipboard-consent-deny');
            const rememberCheckbox = this.dialog.querySelector('#clipboard-consent-remember');

            const handleResponse = (allowed) => {
                const rememberChoice = rememberCheckbox.checked;
                this.remove();
                resolve({ allowed, rememberChoice });
            };

            allowBtn.addEventListener('click', () => handleResponse(true));
            denyBtn.addEventListener('click', () => handleResponse(false));

            // ESC key to deny
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleResponse(false);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);

            // Show dialog
            document.body.appendChild(this.overlay);
            document.body.appendChild(this.dialog);

            // Focus allow button
            setTimeout(() => allowBtn.focus(), 100);
        });
    }

    /**
     * Create the dialog HTML
     */
    createDialog() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        this.overlay.style.backdropFilter = 'blur(4px)';

        // Create dialog
        this.dialog = document.createElement('div');
        this.dialog.className = 'bg-[#1d293d] border border-[#45556c] rounded-lg shadow-xl max-w-md w-full mx-4 z-50';
        this.dialog.setAttribute('role', 'dialog');
        this.dialog.setAttribute('aria-labelledby', 'clipboard-consent-title');
        this.dialog.setAttribute('aria-describedby', 'clipboard-consent-description');

        this.dialog.innerHTML = `
            <div class="p-6">
                <!-- Header -->
                <div class="flex items-start gap-3 mb-4">
                    <svg class="w-6 h-6 text-[#155dfc] flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <div class="flex-1">
                        <h2 id="clipboard-consent-title" class="text-lg font-semibold text-white mb-1">
                            Enable Clipboard Monitoring?
                        </h2>
                        <p class="text-sm text-[#90a1b9]">
                            GrabZilla can automatically detect video URLs when you copy them
                        </p>
                    </div>
                </div>

                <!-- Privacy Disclosure -->
                <div id="clipboard-consent-description" class="bg-[#314158] border border-[#45556c] rounded-lg p-4 mb-4">
                    <div class="space-y-3">
                        <div class="flex items-start gap-2">
                            <svg class="w-4 h-4 text-[#00a63e] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                            <p class="text-sm text-[#cad5e2]">
                                <strong class="text-white">Only checks for video URLs</strong> from YouTube and Vimeo
                            </p>
                        </div>
                        <div class="flex items-start gap-2">
                            <svg class="w-4 h-4 text-[#00a63e] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                            <p class="text-sm text-[#cad5e2]">
                                <strong class="text-white">Never sent to external servers</strong> - stays on your device
                            </p>
                        </div>
                        <div class="flex items-start gap-2">
                            <svg class="w-4 h-4 text-[#00a63e] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                            <p class="text-sm text-[#cad5e2]">
                                <strong class="text-white">Can be disabled anytime</strong> using the toggle switch
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Remember Choice -->
                <label class="flex items-center gap-2 mb-6 cursor-pointer group">
                    <input type="checkbox" id="clipboard-consent-remember"
                           class="w-4 h-4 text-[#155dfc] bg-[#314158] border-[#45556c] rounded focus:ring-2 focus:ring-[#155dfc]">
                    <span class="text-sm text-[#cad5e2] group-hover:text-white transition-colors">
                        Remember my choice (don't ask again)
                    </span>
                </label>

                <!-- Action Buttons -->
                <div class="flex gap-3">
                    <button id="clipboard-consent-deny"
                            class="flex-1 px-4 py-2.5 bg-[#314158] hover:bg-[#3d4f66] border border-[#45556c] text-white rounded-lg font-medium transition-colors focus:ring-2 focus:ring-[#155dfc] focus:outline-none">
                        Don't Allow
                    </button>
                    <button id="clipboard-consent-allow"
                            class="flex-1 px-4 py-2.5 bg-[#155dfc] hover:bg-[#1250e3] text-white rounded-lg font-medium transition-colors focus:ring-2 focus:ring-[#155dfc] focus:outline-none">
                        Allow Clipboard Monitoring
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Remove the dialog from DOM
     */
    remove() {
        if (this.dialog) {
            this.dialog.remove();
            this.dialog = null;
        }
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}

// Export for use in main app
if (typeof window !== 'undefined') {
    window.ClipboardConsentDialog = ClipboardConsentDialog;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClipboardConsentDialog;
}
