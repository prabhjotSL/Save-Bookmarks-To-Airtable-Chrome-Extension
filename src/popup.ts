'use strict';

import './popup.css';

(function () {
  function loadAirtableCredentialsFromStorage() {
    chrome.storage.sync.get(['airtable_key', 'airtable_base', 'airtable_table'], (result) => {
      (document.getElementById('airtable_key') as any).value = result.airtable_key || '';
      (document.getElementById('airtable_base') as any).value = result.airtable_base || '';
      (document.getElementById('airtable_table') as any).value = result.airtable_table || '';
      (document.getElementById('close_tabs') as any).checked = result.close_tabs || true;
    });
  }

  function saveAirtableCredentialsToStorage() {
    chrome.storage.sync.set({
      airtable_key: (document.getElementById('airtable_key') as any).value,
      airtable_base: (document.getElementById('airtable_base') as any).value,
      airtable_table: (document.getElementById('airtable_table') as any).value,
      close_tabs: (document.getElementById('close_tabs') as any).checked
    }, () => {
      console.log('Airtable credentials saved to storage');
    });
  }

  async function createAirtableRecords(base, tableName, records) {
    // save records in batches of 10
    let totalRecords = records.length;
    let totalBatches = Math.ceil(totalRecords / 10);

    for(let i = 0; i < totalBatches; i++) {
      await base(tableName).create(records.splice(0,10));
    }
  }

  document.getElementById('saveTabsButton').addEventListener('click', async function() {
    let apiKey = (document.getElementById('airtable_key') as any).value;
    let baseId = (document.getElementById('airtable_base') as any).value;
    let tableName = (document.getElementById('airtable_table') as any).value;
    let closeTabs = (document.getElementById('close_tabs') as any).checked;
    saveAirtableCredentialsToStorage();

    // Initialize the Airtable API
    var Airtable = require('airtable');
    var base = new Airtable({ apiKey: apiKey }).base(baseId);

    // Get all open tabs
    chrome.tabs.query({}, async function(tabs) {
      // Loop through the tabs and save the URLs to Airtable
      let records = [];
      tabs.forEach(function(tab) {
        if(tab.url != "chrome://newtab/") {
          records.push({
            "fields": {
              "URL": tab.url,
              "Title": tab.title,
              "Favicon": tab.favIconUrl
            }
          });
        }
      });
      await createAirtableRecords(base, tableName, records)
      // Close all tabs
      if(closeTabs) {
        let tabsToClose = [];
        tabsToClose = tabs.filter(function(tab) {
          return !tab.active;
        });
        chrome.tabs.remove(tabsToClose.map(function(tab) {
          return tab.id;
        }));
      }
    });
  });


  document.addEventListener('DOMContentLoaded', loadAirtableCredentialsFromStorage);

  // Communicate with background file by sending a message
  chrome.runtime.sendMessage(
    {
      type: 'GREETINGS',
      payload: {
        message: 'Hello, I am a chrome extension that can save tabs to Airtable!',
      },
    },
    (response) => {
      console.log(response.message);
    }
  );
})();
