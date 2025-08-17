export const INVALID_IMAGE_RESPONSE =
`I'm sorry, but the image you uploaded is not recognized as a valid receipt. Please try again with a clearer image of a receipt.`

export const GENERAL_ERROR_RESPONSE =
`Unable to process the receipt data.`

export const EMPTY_ROOM_RECEIPTS_RESPONSE =
`You don't have any receipts saved in this room.`

export const FAILED_GET_RECEIPTS_RESPONSE =
`Sorry, there was an error retrieving your receipts.`

export const FIRST_INSTALL_RESPONSE =
`🎉 The Receipt Processor Bot has been installed!

Hey! I can help you manage receipts, generate reports, and track spending. 👉 Try typing @receipt-bot help in any channel to see what I can do.

⚙️ Before you start using me, please go to the **App Settings** and fill in the required information for the LLM integration:
- API Endpoint
- API Key
- Model Type

Without these settings, I won’t be able to process receipts or generate reports.`;

export const LLM_UNAVAILABLE_RESPONSE =
`⚠️ I wasn’t able to reach the LLM service right now.
This might be due to a network issue, invalid API settings, or the service being temporarily unavailable.

👉 Please check your LLM configuration in **App Settings** (API Endpoint, API Key, Model Type) and try again.
If the problem persists, wait a few minutes and try again later.`;
