import { Configuration, OpenAIApi } from 'openai';
import config from './config.js';
import { retryRequest } from './utils.js';

let chatGPT: any = {};
let chatOption = {};

const configuration = new Configuration({
  organization: 'org-rxkRvptN9B6BeO38E4Gycpc0',
  apiKey: config.OPENAI_API_KEY,
});

// const completion = await openai.createChatCompletion({
//   model: "gpt-3.5-turbo",
//   messages: [{role: "user", content: "Hello world"}],
// });

// console.log(completion.data.choices[0].message);

export function initChatGPT() {
  chatGPT = new OpenAIApi(configuration);
}

async function getChatGPTReply(content, contactId) {
  const completion = await chatGPT.createChatCompletion(
    {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: content }],
    },
    chatOption[contactId]
  );
  // const { conversationId, text, id } = await chatGPT.sendMessage(
  //   content,
  //   chatOption[contactId]
  // );
  chatOption = {
    [contactId]: {
      parentMessageId: completion.data.id,
    },
  };
  console.log(
    'response: ',
    completion.data.id,
    completion.data.choices[0].message.content
  );
  // response is a markdown-formatted string
  return completion.data.choices[0].message.content.replace('\n', '');
}

export async function replyMessage(contact, content) {
  const { id: contactId } = contact;
  try {
    if (
      content.trim().toLocaleLowerCase() === config.resetKey.toLocaleLowerCase()
    ) {
      chatOption = {
        ...chatOption,
        [contactId]: {},
      };
      await contact.say('Previous conversation has been reset.');
      return;
    }
    const message = await retryRequest(
      () => getChatGPTReply(content, contactId),
      config.retryTimes,
      500
    );

    if (
      (contact.topic && contact?.topic() && config.groupReplyMode) ||
      (!contact.topic && config.privateReplyMode)
    ) {
      const result = content + '\n-----------\n' + message;
      await contact.say(result);
      return;
    } else {
      await contact.say(message);
    }
  } catch (e: any) {
    console.error(e);
    if (e.message.includes('timed out')) {
      await contact.say(
        content +
          '\n-----------\nERROR: Please try again, ChatGPT timed out for waiting response.'
      );
    }
  }
}
