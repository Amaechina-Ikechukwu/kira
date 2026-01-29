/**
 * Google Apps Script for Kira (QuizQuest AI)
 * 
 * Instructions:
 * 1. Open your Google Sheet linked to the Google Form.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code into the editor.
 * 4. Replace 'YOUR_API_URL_HERE' with your actual API URL.
 *    - If testing locally, use your ngrok URL (e.g., https://abc-123.ngrok-free.app/api/lesson/invite)
 *    - If deployed, use your production URL.
 * 5. Save the project.
 * 6. Run the 'setupTrigger' function once to authorize permissions.
 */

// CONFIGURATION
// TODO: Replace this with your actual deployed or ngrok URL
var API_URL = 'YOUR_API_URL_HERE'; 

/**
 * Triggered automatically when a form is submitted.
 * @param {Object} e - The event object containing form response data.
 */
function onFormSubmit(e) {
  if (!e || !e.values) {
    Logger.log('No event data found. Try submitting the form to test.');
    return;
  }

  // Get headers to find the email column automatically
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Find the index of the "Email Address" column (or similar)
  var emailIndex = -1;
  var nameIndex = -1;
  
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i].toLowerCase();
    if (header.includes('email')) {
      emailIndex = i;
    } else if (header.includes('name') && !header.includes('user')) {
      nameIndex = i;
    }
  }

  // Fallback: usually Email is column 1 (index 1) in Form Responses
  // e.values is an array of strings. 
  // Note: e.values indices might differ from sheet columns if the sheet has been rearranged.
  // Using named values is safer if available, but requires "On form submit" trigger from Form directly, 
  // whereas this script binds to the Sheet.
  
  // Let's try to get email from the named values if available, otherwise from index
  var email = '';
  var studentName = '';
  
  if (e.namedValues) {
    // If triggered from the Form directly
    // Look for keys containing "email"
    for (var key in e.namedValues) {
      if (key.toLowerCase().includes('email')) {
        email = e.namedValues[key][0];
      }
      if (key.toLowerCase().includes('name')) {
        studentName = e.namedValues[key][0];
      }
    }
  } 
  
  if (!email && emailIndex !== -1 && e.range) {
    // If triggered from the Sheet
    // Fetch directly from the row to be safe
    var rowValues = sheet.getRange(e.range.rowStart, 1, 1, sheet.getLastColumn()).getValues()[0];
    email = rowValues[emailIndex];
    if (nameIndex !== -1) {
      studentName = rowValues[nameIndex];
    }
  }

  if (!email) {
    Logger.log('Could not find email address in the submission.');
    return;
  }

  Logger.log('Processing submission for: ' + email);

  // Payload to send to Kira
  var payload = {
    email: email,
    studentName: studentName || '',
    personalityTone: 'Hype Man' // Default tone, or you could make this a form field
  };

  // Send the POST request
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    var response = UrlFetchApp.fetch(API_URL, options);
    var responseCode = response.getResponseCode();
    var responseBody = response.getContentText();

    Logger.log('Response Code: ' + responseCode);
    Logger.log('Response Body: ' + responseBody);

    if (responseCode !== 200) {
      // Optional: Email the admin if something goes wrong
      // MailApp.sendEmail('admin@example.com', 'Kira Webhook Failed', 'Failed for ' + email + ': ' + responseBody);
    }
  } catch (error) {
    Logger.log('Error sending webhook: ' + error.toString());
  }
}

/**
 * Run this function once manually to set up the trigger.
 */
function setupTrigger() {
  var sheet = SpreadsheetApp.getActive();
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(sheet)
    .onFormSubmit()
    .create();
    
  Logger.log('Trigger set up successfully! Now, when a form is submitted, the script will run.');
}
