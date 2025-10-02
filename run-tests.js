#!/usr/bin/env node

/**
 * Simple Test Runner to Avoid Memory Issues
 * Runs tests sequentially with memory cleanup
 */

const { spawn } = require('child_process');
const path = require('path');

const testSuites = [
    {
        name: 'Core Unit Tests',
        command: 'npx',
        args: ['vitest', 'run', 'tests/video-model.test.js', 'tests/state-management.test.js', 'tests/ipc-integration.test.js'],
        timeout: 60000
    },
    {
        name: 'Service Tests',
        command: 'npx',
        args: ['vitest', 'run', 'tests/metadata-service.test.js'],
        timeout: 60000
    },
    {
        name: 'Component Tests',
        command: 'npx',
        args: ['vitest', 'run', 'tests/status-components.test.js', 'tests/ffmpeg-conversion.test.js'],
        timeout: 60000
    },
    {
        name: 'Validation Tests',
        command: 'npx',
        args: ['vitest', 'run', 'tests/url-validation.test.js', 'tests/playlist-extraction.test.js'],
        timeout: 60000
    },
    {
        name: 'System Tests',
        command: 'npx',
        args: ['vitest', 'run', 'tests/cross-platform.test.js', 'tests/error-handling.test.js'],
        timeout: 60000
    },
    {
        name: 'Accessibility Tests',
        command: 'npx',
        args: ['vitest', 'run', 'tests/accessibility.test.js'],
        timeout: 60000
    }
];

async function runTest(suite) {
    return new Promise((resolve) => {
        console.log(`\n🧪 Running ${suite.name}...`);

        const childProcess = spawn(suite.command, suite.args, {
            stdio: 'inherit',
            env: {
                ...process.env,
                NODE_OPTIONS: '--max-old-space-size=2048'
            }
        });

        const timeout = setTimeout(() => {
            console.log(`⏰ Test suite ${suite.name} timed out`);
            childProcess.kill('SIGTERM');
            resolve({ success: false, timeout: true });
        }, suite.timeout);

        childProcess.on('close', (code) => {
            clearTimeout(timeout);
            const success = code === 0;
            console.log(`${success ? '✅' : '❌'} ${suite.name} ${success ? 'passed' : 'failed'}`);
            resolve({ success, code });
        });

        childProcess.on('error', (error) => {
            clearTimeout(timeout);
            console.error(`💥 Error running ${suite.name}:`, error.message);
            resolve({ success: false, error: error.message });
        });
    });
}

async function runAllTests() {
    console.log('🚀 Starting GrabZilla Test Suite');
    console.log(`📅 ${new Date().toISOString()}`);
    console.log(`🖥️  Platform: ${process.platform} (${process.arch})`);
    console.log(`📦 Node.js: ${process.version}`);
    
    const results = [];
    
    for (const suite of testSuites) {
        const result = await runTest(suite);
        results.push({ ...suite, ...result });
        
        // Force garbage collection between tests if available
        if (global.gc) {
            global.gc();
        }
        
        // Small delay between test suites
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate report
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST EXECUTION REPORT');
    console.log('='.repeat(60));
    
    let passed = 0;
    let failed = 0;
    
    results.forEach(result => {
        const status = result.success ? 'PASSED' : 'FAILED';
        const icon = result.success ? '✅' : '❌';
        console.log(`${icon} ${result.name.padEnd(25)} ${status}`);
        
        if (result.success) {
            passed++;
        } else {
            failed++;
        }
    });
    
    console.log('-'.repeat(60));
    console.log(`📈 Summary: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
        console.log('\n❌ Some tests failed. Check the output above for details.');
        process.exit(1);
    } else {
        console.log('\n🎉 All tests completed successfully!');
        process.exit(0);
    }
}

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node run-tests.js');
    console.log('Runs all test suites sequentially to avoid memory issues');
    process.exit(0);
}

runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
});