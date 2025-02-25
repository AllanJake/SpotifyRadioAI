require('dotenv').config();
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');

const app = express();
const port = 3050;

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URL
});

app.get('/login', (request, response) => {
    const scopes = ['user-read-private', 'user-read-email', 'user-read-playback-state', 'user-modify-playback-state'];
    response.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', (request, response) => {
    const error = request.query.error;
    const code = request.query.code;
    const state = request.query.state; 

    if (error) {
        console.error('Callback error:', error);
        response.send(`Callback error: ${error}`);
        return;
    }

    spotifyApi.authorizationCodeGrant(code).then(data => {
        const accessToken = data.body['access_token'];
        const refreshToken = data.body['refresh_token'];
        const expiresIn = data.body['expires_in'];

        spotifyApi.setAccessToken(accessToken);
        spotifyApi.setRefreshToken(refreshToken);

        console.log(accessToken, refreshToken);
        response.send("Success!");

        setInterval(async() => {
            const data = await spotifyApi.refreshAccessToken();
            const accessTokenRefreshed = data.body['access_token'];
            spotifyApi.setAccessToken(accessTokenRefreshed);
        }, expiresIn/2 * 1000);
    }).catch(error => {
        console.error('Error getting Tokens:', error);
        response.send(`Error getting Tokens: ${error}`);
    });

});

app.get('/search', (request, response) => {
    const {q} = request.query;
    spotifyApi.searchTracks(q).then(data => {
        const trackUri = data.body.tracks.items[0].uri;
        response.send(trackUri);
    }).catch(error => {
        console.error('Error searching track:', error);
        response.send(`Error searching track: ${error}`);
    });
});

app.get('/play', (request, response) => {
    const {uri} = request.query;
    spotifyApi.play({uris: [uri]}).then(() => {
        response.send('Playing!');
    }).catch(error => {
        console.error('Error playing track:', error);
        response.send(`Error playing track: ${error}`);
    });
});

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
})