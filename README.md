# Twitch PointTracker [![License](https://img.shields.io/github/license/Kirdow/StreamPoints.svg)](https://github.com/Kirdow/StreamPoints/blob/master/LICENSE)

Chromium Extension for tracking bot-based points on the streaming platform Twitch.

## How to install
Simply add [this Chromium extension](https://chrome.google.com/webstore/detail/twitch-pointtracker/abadiofofcalmkdepnjmdmnobfkleoaj) to your browser and you're good to go. 

## How to use
Once you have it installed (see previous step) and you enter a Twitch channel which has points on their stream, your point count will appear in the search field in the navbar as a placeholder. Automatically updates when you switch stream and automatically resets to default text when you switch to an unsupported channel.

## What points do you track, and what bots?
I don't track Twitch's default points, because that already exists on the site itself. What I do track is points managed by bots like StreamElements, Streamlabs or Nightbot. Note that currently, I'm only supporting points from StreamElements, as that was the only one I found having a public easy-to-implement API that was easy to work with. Whenever I find time and opportunity to implement the other bots, I will definitely do so. But at the current point in time, only StreamElements is supported.

## Contributions?
Sure, all welcome, make sure you document the commits the same way I do (preferrably, not a rule, but please document each change in depth with a dash followed by a space, and there's a greater chance I accept the changes), and submit a PR in an issue. I might take time before I accept it however, so please be patient.

## Why did you implement X in Y way?
I'm not native to JavaScript, so some implementations might be off. If there's anything that really doesn't belong in a JavaScript code-base, don't hesitate to create a PR and submit an issue. If you could explain why my implementation is bad for whatever reason, I'm more than happy to accept the PR and adapt.

## Hey, I like your work, how can I support you?
I don't really like to ask for people to pay for my stuff, but if you really want to, you could sent some BTC to ``1DJpCruQsQ5AiSecyzX76LB56wFWNR4JwL``. Just remember, you're not paying for a product, you're just showing your support and it's simply a donation. Because of this, and because BTC is a crypto, I'm not accepting any refunds, so please think twice before sending anything to that address, and make sure you do own the money you send to me, as sending it back won't be an option. All in all, no donations needed, but donations are always welcome and do help, so if you really wish to support me, thank you very much for doing so.
