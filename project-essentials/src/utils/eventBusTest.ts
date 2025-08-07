/**
 * Simple integration test for event-driven Slack architecture
 * This can be run manually to verify the event system works correctly
 */

import { eventBus, SlackEvents, createJobId } from './eventBus';

export async function testEventDrivenArchitecture(): Promise<void> {
  console.log('🧪 Testing Event-Driven Slack Architecture');

  // Test 1: Event Bus Basic Functionality
  console.log('\n📡 Testing Event Bus...');
  
  let eventReceived = false;
  const unsubscribe = eventBus.on('slack.oauth.started', (event) => {
    console.log('✅ Event received:', event);
    eventReceived = true;
  });

  await SlackEvents.emitOAuthStarted('test-client-id', 'https://localhost:8443/callback');
  
  if (eventReceived) {
    console.log('✅ Event bus working correctly');
  } else {
    console.log('❌ Event bus failed');
  }
  
  unsubscribe();

  // Test 2: Service Status (SIMPLIFIED)
  console.log('\n🔧 Testing Service Status...');
  console.log('Using simplified connection system - no complex job tracking needed');

  // Test 3: Job ID Generation
  console.log('\n🆔 Testing Job ID Generation...');
  const jobId1 = createJobId();
  const jobId2 = createJobId();
  
  if (jobId1 !== jobId2 && jobId1.startsWith('job_')) {
    console.log('✅ Job ID generation working correctly');
    console.log('Sample Job IDs:', { jobId1, jobId2 });
  } else {
    console.log('❌ Job ID generation failed');
  }

  // Test 4: Event History
  console.log('\n📚 Testing Event History...');
  const history = eventBus.getEventHistory(5);
  console.log(`Event History (last ${history.length} events):`, 
    history.map(h => ({ event: h.event, timestamp: new Date(h.timestamp).toISOString() }))
  );

  // Test 5: Wait for Event (with timeout)
  console.log('\n⏱️ Testing Event Wait with Timeout...');
  
  // Emit an event after a short delay
  setTimeout(() => {
    SlackEvents.emitNotification('info', 'Test', 'This is a test notification');
  }, 100);

  try {
    const event = await eventBus.waitForEvent('ui.notification.show', 1000);
    console.log('✅ Event wait working correctly:', { type: event.type, title: event.title });
  } catch (error) {
    console.log('❌ Event wait failed:', error);
  }

  console.log('\n🎉 Event-driven architecture test completed!');
}

// Export for manual testing
export const testSlackEventIntegration = {
  testEventBus: testEventDrivenArchitecture,
  
  // Test OAuth flow (without actual OAuth)
  testOAuthEvents: async () => {
    console.log('🔐 Testing OAuth Event Flow...');
    
    let eventsReceived: string[] = [];
    
    const unsubscribers = [
      eventBus.on('slack.oauth.started', () => { eventsReceived.push('started'); }),
      eventBus.on('slack.oauth.completed', () => { eventsReceived.push('completed'); }),
      eventBus.on('slack.oauth.failed', () => { eventsReceived.push('failed'); })
    ];

    // Simulate OAuth flow
    await SlackEvents.emitOAuthStarted('test-client', 'test-redirect');
    await SlackEvents.emitOAuthCompleted('team-123', 'token-abc', 'user-456', 'read,write');
    
    unsubscribers.forEach(unsub => unsub());
    
    console.log('OAuth Events Received:', eventsReceived);
    return eventsReceived.includes('started') && eventsReceived.includes('completed');
  },

  // Test connection flow events
  testConnectionEvents: async () => {
    console.log('🔗 Testing Connection Event Flow...');
    
    let eventsReceived: string[] = [];
    
    const unsubscribers = [
      eventBus.on('slack.connection.requested', () => { eventsReceived.push('requested'); }),
      eventBus.on('slack.connection.completed', () => { eventsReceived.push('completed'); }),
      eventBus.on('slack.connection.failed', () => { eventsReceived.push('failed'); })
    ];

    // Simulate connection flow
    await SlackEvents.emitConnectionRequested('project-123', 'channel-456', 'test-channel');
    await SlackEvents.emitConnectionCompleted('project-123', 'channel-456', 'sync-789');
    
    unsubscribers.forEach(unsub => unsub());
    
    console.log('Connection Events Received:', eventsReceived);
    return eventsReceived.includes('requested') && eventsReceived.includes('completed');
  },

  // Test sync flow events
  testSyncEvents: async () => {
    console.log('🔄 Testing Sync Event Flow...');
    
    let eventsReceived: string[] = [];
    
    const unsubscribers = [
      eventBus.on('slack.sync.started', () => { eventsReceived.push('started'); }),
      eventBus.on('slack.sync.progress', () => { eventsReceived.push('progress'); }),
      eventBus.on('slack.sync.completed', () => { eventsReceived.push('completed'); })
    ];

    const jobId = createJobId();
    
    // Simulate sync flow
    await SlackEvents.emitSyncStarted(jobId, 'project-123', 'channel-456', 100);
    await eventBus.emit('slack.sync.progress', {
      jobId, projectId: 'project-123', channelId: 'channel-456',
      processed: 50, total: 100
    });
    await SlackEvents.emitSyncCompleted(jobId, 'project-123', 'channel-456', 100, 5, 30000);
    
    unsubscribers.forEach(unsub => unsub());
    
    console.log('Sync Events Received:', eventsReceived);
    return eventsReceived.includes('started') && eventsReceived.includes('progress') && eventsReceived.includes('completed');
  }
};

// Run basic test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - attach to window for manual testing
  (window as any).testSlackEvents = testSlackEventIntegration;
  console.log('🔍 Slack event testing functions attached to window.testSlackEvents');
}