# Audio recorder

## About the proof of concept

This is a proof of concept of a simple audio recorder using the current web technologies.

It comes with two parts:

- a client (`main.js`): the web page that will record the audio using a [`MediaRecorder`](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) after the user manually starts it. The audio data is then sent to the backend using POST requests. The data is sent in chunks.
- a server (`server.js`): a simple NodeJS server that will receive the audio data and save it to multiple files

To make sure that the backend gets audio data, the client will send a small chunk of audio every some seconds.
The split leads to an issue: the first chunk is playable, but the following ones are not.

Here are some ways to solve this:

- the client sends the audio data in one big chunk, but if the client gets disconnected, we lose all the data, or we may face issues with the size of the data
- the client sends the audio data in chunks, but the backend will merge them into one file: this will work, but if we want to do some "live" operations on the audio data, like transcribing it, we will have to wait for the recording to be finished.
- same, but we "fix" the chunks files in the backend, so that they can be played individually: this is working, but if the backend gets a lot of data, it will use a lot of resources
- same, but we "fix" the chunks files in the client directly: it will use a bit more resources in the client, but it's working fine

## Start the demo

```sh
# Install required dependencies
npm install
# Start the demo: client and server
npm start
```

Then open http://localhost:5173/ in your browser.

Once you start the recording, the audio data will be sent to the backend, and you will be able to get the files in the `records` folder.
They are named in a way that will allow you to play them in the correct order by sorting them.

## Future improvements

- use websockets instead of POST requests
- use WebRTC to send the audio stream directly to the backend

but make sure to have nice fallbacks for browsers that don't support these technologies or if they are using a network or a system that doesn't allow them.
