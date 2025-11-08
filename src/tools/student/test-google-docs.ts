/**
 * Google Docs Tool Test Script
 * 
 * Test the Google Docs tool to verify all actions work correctly
 * 
 * Usage:
 *   npx tsx src/tools/student/test-google-docs.ts
 */

import 'dotenv/config';
import { googleDocsTool } from './google-docs.js';

async function testDocsTool() {
  console.log('🧪 Google Docs Tool Test\n');
  console.log('='.repeat(50));

  let testDocId: string | undefined;

  try {
    // Test 1: Create a document
    console.log('\n📋 Test 1: Create a new document');
    console.log('-'.repeat(50));
    const createResult = await googleDocsTool.execute({
      action: 'create_document',
      title: 'Test Document - School Agent',
      content: 'This is a test document created by the School Agent CLI.\n\nIt includes:\n- Multiple lines\n- Test content\n- Automated testing',
    });
    
    if (createResult.success) {
      console.log('✅ Success!');
      console.log(createResult.output);
      
      // Extract document ID for further tests
      const docIdMatch = createResult.output?.match(/🆔 ID: (.+)/);
      if (docIdMatch) {
        testDocId = docIdMatch[1].trim();
        
        // Test 2: Get document content
        console.log('\n📋 Test 2: Get document content');
        console.log('-'.repeat(50));
        const getResult = await googleDocsTool.execute({
          action: 'get_document',
          document_id: testDocId,
        });
        
        if (getResult.success) {
          console.log('✅ Success!');
          console.log(getResult.output);
        } else {
          console.log('❌ Failed:', getResult.error);
        }
        
        // Test 3: Append text
        console.log('\n📋 Test 3: Append text to document');
        console.log('-'.repeat(50));
        const appendResult = await googleDocsTool.execute({
          action: 'append_text',
          document_id: testDocId,
          text: '\n\n## Additional Section\n\nThis text was appended after document creation.',
        });
        
        if (appendResult.success) {
          console.log('✅ Success!');
          console.log(appendResult.output);
        } else {
          console.log('❌ Failed:', appendResult.error);
        }
        
        // Test 4: Insert text at position
        console.log('\n📋 Test 4: Insert text at specific position');
        console.log('-'.repeat(50));
        const insertResult = await googleDocsTool.execute({
          action: 'insert_text',
          document_id: testDocId,
          text: '\n[INSERTED AT BEGINNING] ',
          index: 1,
        });
        
        if (insertResult.success) {
          console.log('✅ Success!');
          console.log(insertResult.output);
        } else {
          console.log('❌ Failed:', insertResult.error);
        }
        
        // Test 5: Get updated document
        console.log('\n📋 Test 5: Get updated document content');
        console.log('-'.repeat(50));
        const getUpdatedResult = await googleDocsTool.execute({
          action: 'get_document',
          document_id: testDocId,
        });
        
        if (getUpdatedResult.success) {
          console.log('✅ Success!');
          console.log(getUpdatedResult.output);
        } else {
          console.log('❌ Failed:', getUpdatedResult.error);
        }
        
        // Test 6: Batch update (format text as bold)
        console.log('\n📋 Test 6: Batch update document');
        console.log('-'.repeat(50));
        const updateResult = await googleDocsTool.execute({
          action: 'update_document',
          document_id: testDocId,
          requests: [
            {
              insertText: {
                text: '\n\n---\nUpdated via batch operation',
                location: { index: 1 },
              },
            },
          ],
        });
        
        if (updateResult.success) {
          console.log('✅ Success!');
          console.log(updateResult.output);
        } else {
          console.log('❌ Failed:', updateResult.error);
        }
      }
    } else {
      console.log('❌ Failed:', createResult.error);
    }

    // Test 7: List documents
    console.log('\n📋 Test 7: List all documents');
    console.log('-'.repeat(50));
    const listResult = await googleDocsTool.execute({
      action: 'list_documents',
      max_results: 5,
    });
    
    if (listResult.success) {
      console.log('✅ Success!');
      console.log(listResult.output);
    } else {
      console.log('❌ Failed:', listResult.error);
    }

    // Test 8: Search documents
    console.log('\n📋 Test 8: Search for "School Agent" documents');
    console.log('-'.repeat(50));
    const searchResult = await googleDocsTool.execute({
      action: 'list_documents',
      query: 'School Agent',
      max_results: 10,
    });
    
    if (searchResult.success) {
      console.log('✅ Success!');
      console.log(searchResult.output);
    } else {
      console.log('❌ Failed:', searchResult.error);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!\n');
    
    if (testDocId) {
      console.log(`📝 Test document created:`);
      console.log(`   🆔 ID: ${testDocId}`);
      console.log(`   🔗 Link: https://docs.google.com/document/d/${testDocId}/edit`);
      console.log(`\n💡 You can manually delete this test document from Google Drive.`);
    }

  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log('❌ Test failed!\n');
    console.log('Error:', error);
    process.exit(1);
  }
}

// Run the test
testDocsTool();
