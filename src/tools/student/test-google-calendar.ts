/**
 * Google Calendar Tool Test Script
 * 
 * Test the Google Calendar tool to verify all actions work correctly
 * 
 * Usage:
 *   npx tsx src/tools/student/test-google-calendar.ts
 */

import 'dotenv/config';
import { googleCalendarTool } from './google-calendar.js';

async function testCalendarTool() {
  console.log('🧪 Google Calendar Tool Test\n');
  console.log('='.repeat(50));

  try {
    // Test 1: List upcoming events
    console.log('\n📋 Test 1: List upcoming events');
    console.log('-'.repeat(50));
    const listResult = await googleCalendarTool.execute({
      action: 'list_events',
      max_results: 5,
    });
    
    if (listResult.success) {
      console.log('✅ Success!');
      console.log(listResult.output);
    } else {
      console.log('❌ Failed:', listResult.error);
    }

    // Test 2: Create a test event
    console.log('\n📋 Test 2: Create a test event');
    console.log('-'.repeat(50));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(15, 0, 0, 0);
    
    const createResult = await googleCalendarTool.execute({
      action: 'create_event',
      summary: 'Test Event - School Agent',
      description: 'This is a test event created by the School Agent CLI',
      start: tomorrow.toISOString(),
      end: endTime.toISOString(),
      location: 'Virtual Meeting',
    });
    
    if (createResult.success) {
      console.log('✅ Success!');
      console.log(createResult.output);
      
      // Extract event ID for further tests
      const eventIdMatch = createResult.output?.match(/🆔 ID: (.+)/);
      if (eventIdMatch) {
        const eventId = eventIdMatch[1].trim();
        
        // Test 3: Get the event
        console.log('\n📋 Test 3: Get event details');
        console.log('-'.repeat(50));
        const getResult = await googleCalendarTool.execute({
          action: 'get_event',
          event_id: eventId,
        });
        
        if (getResult.success) {
          console.log('✅ Success!');
          console.log(getResult.output);
        } else {
          console.log('❌ Failed:', getResult.error);
        }
        
        // Test 4: Update the event
        console.log('\n📋 Test 4: Update event');
        console.log('-'.repeat(50));
        const updateResult = await googleCalendarTool.execute({
          action: 'update_event',
          event_id: eventId,
          summary: 'Test Event - School Agent (Updated)',
          description: 'This event has been updated!',
        });
        
        if (updateResult.success) {
          console.log('✅ Success!');
          console.log(updateResult.output);
        } else {
          console.log('❌ Failed:', updateResult.error);
        }
        
        // Test 5: Search for the event
        console.log('\n📋 Test 5: Search for event');
        console.log('-'.repeat(50));
        const searchResult = await googleCalendarTool.execute({
          action: 'search_events',
          query: 'School Agent',
          max_results: 5,
        });
        
        if (searchResult.success) {
          console.log('✅ Success!');
          console.log(searchResult.output);
        } else {
          console.log('❌ Failed:', searchResult.error);
        }
        
        // Test 6: Delete the event
        console.log('\n📋 Test 6: Delete event');
        console.log('-'.repeat(50));
        const deleteResult = await googleCalendarTool.execute({
          action: 'delete_event',
          event_id: eventId,
        });
        
        if (deleteResult.success) {
          console.log('✅ Success!');
          console.log(deleteResult.output);
        } else {
          console.log('❌ Failed:', deleteResult.error);
        }
      }
    } else {
      console.log('❌ Failed:', createResult.error);
    }

    // Test 7: Create all-day event
    console.log('\n📋 Test 7: Create all-day event');
    console.log('-'.repeat(50));
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const startDate = nextWeek.toISOString().split('T')[0];
    
    const dayAfter = new Date(nextWeek);
    dayAfter.setDate(dayAfter.getDate() + 1);
    const endDate = dayAfter.toISOString().split('T')[0];
    
    const allDayResult = await googleCalendarTool.execute({
      action: 'create_event',
      summary: 'All-Day Test Event',
      start_date: startDate,
      end_date: endDate,
      description: 'This is an all-day event',
    });
    
    if (allDayResult.success) {
      console.log('✅ Success!');
      console.log(allDayResult.output);
      
      // Clean up - delete the all-day event
      const allDayIdMatch = allDayResult.output?.match(/🆔 ID: (.+)/);
      if (allDayIdMatch) {
        const allDayEventId = allDayIdMatch[1].trim();
        await googleCalendarTool.execute({
          action: 'delete_event',
          event_id: allDayEventId,
        });
        console.log('🗑️  All-day event cleaned up');
      }
    } else {
      console.log('❌ Failed:', allDayResult.error);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!\n');

  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log('❌ Test failed!\n');
    console.log('Error:', error);
    process.exit(1);
  }
}

// Run the test
testCalendarTool();
