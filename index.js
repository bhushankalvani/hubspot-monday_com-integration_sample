const axios = require('axios');

/**
 * @note Create item in monday.com via GraphQL API
 * @param {Object} itemData - Formatted monday.com item data
 * @returns {Promise<Object>} - monday.com API response
 */
async function createMondayItem(itemData) {
    const MONDAY_API_URL = 'https://api.monday.com/v2';

    const mondayObject = `
    mutation {
      create_item(
        board_id: ${itemData.boardId},
        item_name: "${itemData.itemName}",
        column_values: ${JSON.stringify(itemData.columnValues)}
      ) {
        id
      }
    }
  `;

    try {
        // @note API call representing a call to Monday.com. It has been commented but you can uncomment it and try to run it. Uncomment for actual Monday.com API call
        // const response = await axios({
        //     url: MONDAY_API_URL,
        //     method: 'post',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         // you can further use the dotenv package to import and access the process.env variables from your env configs and use token.
        //         'Authorization': `Bearer <DUMMY-TOKEN>` 
        //     },
        //     data: { query: mondayObject }
        // });

        // if (response.data.errors) {
        //     throw new Error(`Monday.com API error: ${JSON.stringify(response.data.errors)}`);
        // }

        // return response.data.data.create_item; // actual response will return only id since that is what is requested from graph.
        return { id: 1234569820 }; // mock response
    } catch (error) {
        // Enhanced error handling for network issues
        if (error.isAxiosError) {
            throw new Error(`Network error: ${error.message}`);
        }
        throw error;
    }
}

/**
 * @note Retry logic for hubspot function
 * @param {*} error 
 * @returns {Boolean} true/false
 */
function canRetry(error) {
    if (error.isAxiosError) {
        const status = error.response?.status;
        /**
         * @note return false if no 'status' key is found or error status is greater than 500 like 502 or 503.
         * 429 code is for rate limit on API. Too many requests at a time or interval of time
         */ 
        return !status || status === 429 || status >= 500; 
    }

    // Consider certain error messages as retryable
    const retryableMessages = [
        'timeout',
        'network',
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND'
    ];

    return retryableMessages.some(msg => error.message.includes(msg)); // done to check for includes rather than a direct match for status text
}

/**
 * @note main function to handle HubSpot webhook and monday.com
 * @param {Object} payload - webhook payload request received
 */
async function hubspotToMondayIntegration(payload) {
    try {

        // Validate required fields exist
        if (!payload.dealName || !payload.dealAmount || !payload.contactEmail || !payload.propertyValue) {
            throw new Error('Missing required deal data');
        }
        
        const dealData = {
            dealName: payload.dealName,
            dealAmount: parseFloat(payload.dealAmount), // converting to a float number instead of string.
            contactEmail: payload.contactEmail,
            dealStage: payload.propertyValue
        };

        // Map HubSpot deal stages to monday.com statuses
        const stageMap = {
            // you can add other stage mappings as needed, keeping it simple for won and lost deal
            'closedwon': 'Closed Won',
            'closedlost': 'Closed Lost',
        };

        // using stageMap to map to monday status as per dummy object provided
        const mondayStatus = stageMap[dealData.dealStage.toLowerCase()] || 'New';

        /**
         * @note Format data for monday.com GraphQL mutation
         * @link https://graphql.org/learn/mutations/
         */ 
        const mondayItem = {
            boardId: 2012772463, // will be dynamic
            itemName: dealData.dealName,
            columnValues: JSON.stringify({
                "status": { "label": mondayStatus },
                "numbers": dealData.dealAmount,
                "email": {
                    "email": dealData.contactEmail,
                    "text": dealData.contactEmail
                },
            })
        }

        // Send data to monday.com
        const mondayResponse = await createMondayItem(mondayItem);

        // you can save response data, and timestamp to database, probably create a function to store db
        console.log(`HubSpot Event: ${payload.eventId} processed successfully.\nMonday.com Event: ${mondayResponse.id} on Board ${mondayItem.boardId}`);

        return {
            success: true,
            message: 'Sync successful',
            data: {
                mondayItemId: mondayResponse.id
            },
            error: null,
        };
    } catch (error) {
        console.error('fn failure', error);
        
        const retry = canRetry(error);
        
        // retry if we have axios related error or request failed to execute due to network issues
        if (retry) {
            // retry logic ideally should not have recursion but for the sake of it, I am commenting it which shows retry logic can be used here.
            // hubspotToMondayIntegration(payload)
        }

        // return error if retry not possible
        return {
            success: false,
            message: 'Error processing webhook',
            data: null,
            error: error.message,
        };
    }
};

/**
 * @note this directly calls the function on file execution using `node index.js`.
 * @note Using the dummy object provided for HubSpot.
 */
const payload = {
    "eventId": "123456",
    "eventType": "deal.propertyChange",
    "propertyName": "dealstage",
    "objectId": "56789",
    "objectType": "DEAL",
    "propertyValue": "closedwon",
    "dealName": "Acme Corp Implementation",
    "dealAmount": "25000",
    "contactEmail": "john.doe@acme.com"
};
hubspotToMondayIntegration(payload); // making a function call to mock the request.

/** @note if it's a service use this. */
// module.exports = {
//     hubspotToMondayIntegration,
// }
