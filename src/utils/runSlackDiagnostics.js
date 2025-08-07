/**
 * Node.js script to run Slack diagnostics from command line
 * This allows us to test the system without running the full UI
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple test functions that don't require Tauri runtime

async function testDatabaseSchema() {
  try {
    // Check if we can find database-related files
    const dbUtilsPath = path.join(__dirname, 'database.ts');
    const exists = fs.existsSync(dbUtilsPath);
    
    if (!exists) {
      return {
        test: 'Database Schema',
        status: 'fail',
        message: 'Database utilities file not found',
        details: { path: dbUtilsPath }
      };
    }

    // Read the database file to check for Slack-related schema
    const dbContent = fs.readFileSync(dbUtilsPath, 'utf8');
    const hasSlackTables = dbContent.includes('slack') || dbContent.includes('Slack');
    
    return {
      test: 'Database Schema',
      status: hasSlackTables ? 'pass' : 'warning',
      message: hasSlackTables ? 'Database utilities include Slack references' : 'No Slack schema references found',
      details: { hasSlackReferences: hasSlackTables }
    };
  } catch (error) {
    return {
      test: 'Database Schema',
      status: 'fail',
      message: `Database check failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testSlackServiceFiles() {
  try {
    const slackDir = path.join(__dirname, '../modules/slack/services');
    
    if (!fs.existsSync(slackDir)) {
      return {
        test: 'Slack Service Files',
        status: 'fail',
        message: 'Slack services directory not found',
        details: { path: slackDir }
      };
    }

    const files = fs.readdirSync(slackDir);
    const serviceFiles = files.filter(f => f.endsWith('.ts'));
    
    // Check for key service files
    const keyServices = [
      'SlackChannelConnection.ts',
      'SlackAIAnalysisServiceV2.ts', 
      'SlackSyncOrchestrator.ts',
      'SlackCredentialsService.ts'
    ];
    
    const missingServices = keyServices.filter(service => !serviceFiles.includes(service));
    
    return {
      test: 'Slack Service Files',
      status: missingServices.length === 0 ? 'pass' : 'warning',
      message: `Found ${serviceFiles.length} service files, ${missingServices.length} missing`,
      details: { 
        totalFiles: serviceFiles.length,
        missingServices,
        foundServices: serviceFiles
      }
    };
  } catch (error) {
    return {
      test: 'Slack Service Files',
      status: 'fail',
      message: `Service files check failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testBackendFiles() {
  try {
    const tauriSrcDir = path.join(__dirname, '../../src-tauri/src');
    
    if (!fs.existsSync(tauriSrcDir)) {
      return {
        test: 'Backend Files',
        status: 'fail',
        message: 'Tauri source directory not found',
        details: { path: tauriSrcDir }
      };
    }

    const files = fs.readdirSync(tauriSrcDir);
    const slackFiles = files.filter(f => f.includes('slack'));
    
    // Check for key backend files
    const keyFiles = ['slack.rs', 'slack_api.rs', 'ai_llm_service.rs'];
    const foundKeyFiles = keyFiles.filter(file => files.includes(file));
    
    return {
      test: 'Backend Files',
      status: foundKeyFiles.length === keyFiles.length ? 'pass' : 'warning',
      message: `Found ${foundKeyFiles.length}/${keyFiles.length} key backend files`,
      details: { 
        slackFiles,
        foundKeyFiles,
        missingFiles: keyFiles.filter(f => !foundKeyFiles.includes(f))
      }
    };
  } catch (error) {
    return {
      test: 'Backend Files',
      status: 'fail',
      message: `Backend files check failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testEventBusImplementation() {
  try {
    const eventBusPath = path.join(__dirname, 'eventBus.ts');
    
    if (!fs.existsSync(eventBusPath)) {
      return {
        test: 'Event Bus Implementation',
        status: 'fail',
        message: 'Event bus file not found',
        details: { path: eventBusPath }
      };
    }

    const content = fs.readFileSync(eventBusPath, 'utf8');
    
    // Check for key event bus features
    const hasSlackEvents = content.includes('SlackEventMap') || content.includes('slack.');
    const hasEmitFunction = content.includes('emit');
    const hasOnFunction = content.includes('on(');
    
    const issues = [];
    if (!hasSlackEvents) issues.push('No Slack event definitions found');
    if (!hasEmitFunction) issues.push('No emit function found');
    if (!hasOnFunction) issues.push('No event listener function found');
    
    return {
      test: 'Event Bus Implementation',
      status: issues.length === 0 ? 'pass' : 'warning',
      message: issues.length === 0 ? 'Event bus appears properly implemented' : `Event bus issues: ${issues.join(', ')}`,
      details: { hasSlackEvents, hasEmitFunction, hasOnFunction, issues }
    };
  } catch (error) {
    return {
      test: 'Event Bus Implementation',
      status: 'fail',
      message: `Event bus check failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testConfigurationFiles() {
  try {
    // Check for common configuration files
    const configFiles = [
      'package.json',
      'tauri.conf.json',
      'vite.config.ts',
      'src-tauri/Cargo.toml'
    ];
    
    const results = {};
    let foundFiles = 0;
    
    for (const file of configFiles) {
      const filePath = path.resolve(__dirname, '../..', file);
      if (fs.existsSync(filePath)) {
        foundFiles++;
        results[file] = 'found';
        
        // Check package.json for Slack-related dependencies
        if (file === 'package.json') {
          const packageContent = fs.readFileSync(filePath, 'utf8');
          const packageJson = JSON.parse(packageContent);
          results.hasSlackDeps = Object.keys(packageJson.dependencies || {}).some(dep => dep.includes('slack'));
          results.hasTauriDeps = Object.keys(packageJson.dependencies || {}).some(dep => dep.includes('tauri'));
        }
      } else {
        results[file] = 'missing';
      }
    }
    
    return {
      test: 'Configuration Files',
      status: foundFiles === configFiles.length ? 'pass' : 'warning',
      message: `Found ${foundFiles}/${configFiles.length} configuration files`,
      details: results
    };
  } catch (error) {
    return {
      test: 'Configuration Files',
      status: 'fail',
      message: `Configuration check failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function runStaticDiagnostics() {
  console.log('🔍 Running Static Slack Integration Diagnostics...');
  console.log('=====================================');
  
  const tests = [
    testDatabaseSchema,
    testSlackServiceFiles,
    testBackendFiles,
    testEventBusImplementation,
    testConfigurationFiles
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
      
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${result.test}: ${result.message}`);
      
      if (result.details && Object.keys(result.details).length > 0) {
        console.log(`   Details:`, result.details);
      }
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error);
      results.push({
        test: test.name,
        status: 'fail',
        message: `Test execution failed: ${error.message}`,
        details: { error: error.message }
      });
    }
  }
  
  console.log('\n📊 Summary:');
  const passed = results.filter(r => r.status === 'pass').length;
  const warnings = results.filter(r => r.status === 'warning').length;  
  const failed = results.filter(r => r.status === 'fail').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`❌ Failed: ${failed}`);
  
  console.log('\n💡 Next Steps:');
  if (failed > 0) {
    console.log('🔧 Fix failed tests first - these indicate missing or broken components');
  }
  if (warnings > 0) {
    console.log('⚠️  Review warnings - these may indicate configuration issues');
  }
  if (passed === results.length) {
    console.log('🎉 All static checks passed! Issues are likely in runtime configuration (API keys, tokens, etc.)');
  }
  
  console.log('=====================================\n');
  
  return {
    passed,
    warnings,
    failed,
    results
  };
}

// Run the diagnostics
runStaticDiagnostics().catch(console.error);