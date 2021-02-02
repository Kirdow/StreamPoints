function VariableWrapper(_default, _type) {
    this._default = _default
    this._value = _default
    this._type = _type

    this.get = function() {
        if (typeof(this._type) === "string" && typeof(this._value) !== this._type) {
            this._value = this._default
        }

        return this._value
    }

    this.set = function(value) {
        this._value = value
    }

    this.modify = function(value) {
        this.set(value)
        return this.get()
    }
}

function PointTracker() {
    // Variables
    this._points = new VariableWrapper(0, "number")
    this.e = new VariableWrapper(null)
    this._timer = new VariableWrapper(0, "number")
    this._timerup = new VariableWrapper(0, "number")
    this._warn = new VariableWrapper(0, "number")
    this.reqon = new VariableWrapper(false, "boolean")
    this._search = new VariableWrapper("Search", "string")
    this._support = new VariableWrapper(false, "boolean")
    this._pname = new VariableWrapper("Points", "string")
    this._ktnname = new VariableWrapper(null)
    this._channel = new VariableWrapper(null)
    this._ktnpause = new VariableWrapper(false, "boolean")

    // Getters and setters
    this.isSupport = function() {
        return this._support.get()
    }

    this.getPointName = function() {
        return this._pname.get()
    }

    this.getUserName = function() {
        return this._ktnname.get()
    }

    this.getChannelName = function() {
        return this._channel.get()
    }

    this.isPaused = function() {
        return this._ktnpause.get()
    }

    this.setSupport = function(value) {
        return this._support.modify(value)
    }

    this.setPointName = function(value) {
        return this._pname.modify(value)
    }

    this.setUserName = function(value) {
        return this._ktnname.modify(value)
    }

    this.setChannelName = function(value) {
        return this._channel.modify(value)
    }

    this.setPause = function(value) {
        return this._ktnpause.modify(value)
    }

    this.getPoints = function() {
        return this._points.get()
    }

    this.setPoints = function(value) {
        return this._points.modify(value)
    }

    this.getTimer = function() {
        return this._timer.get()
    }

    this.getTimerUp = function() {
        return this._timerup.get()
    }

    this.getWarn = function() {
        return this._warn.get()
    }

    this.isReqon = function() {
        return this.reqon.get()
    }

    this.getSearch = function() {
        return this._search.get()
    }

    this.setTimer = function(value) {
        return this._timer.modify(value)
    }

    this.setTimerUp = function(value) {
        return this._timerup.modify(value)
    }

    this.setWarn = function(value) {
        return this._warn.modify(value)
    }

    this.tickTimer = function() {
        return this._timer.modify(this._timer.get() - 1)
    }

    this.tickTimerUp = function() {
        return this._timerup.modify(this._timerup.get() + 1)
    }

    this.tickWarn = function() {
        return this._warn.modify(this._warn.get() - 1)
    }

    this.setReqon = function(value) {
        return this.reqon.modify(value)
    }

    this.setSearch = function(value) {
        return this._search.modify(value)
    }

    // Displaying placeholder text
    this.getDisplay = function() {
        return this.e.get().placeholder
    }

    this.setDisplay = function(data) {
        this.e.get().placeholder = data
    }

    // Displaying points
    this.displayPoints = function(data) {
        if (typeof(data) !== "number") {
            this.clearDisplay()
            return
        }

        // If there is a cooldown, opt to showing the cooldown after the point count
        if (this.getTimer() > 0) {
            let update = `Updates in ${this.getTimer()}s`
            if (this.getWarn() > 0) {
                // If there's a force warning active, show that instead.
                update = `Force available in ${60 - this.getTimerUp()}s`
            }
            this.setDisplay(`${this.getPointName()}: ${this.getPoints()} | ${update}`)
        } else {
            // Since there's no cooldown, display only the value
            this.setPoints(data)
            this.setDisplay(`${this.getPointName()}: ${data}`)
        }
    }

    // The timer ticking running every second
    this.updateTimer = function() {
        if (!this.isSupport()) return

        // Tick the timers, and the warn if active
        this.tickTimer()
        this.tickTimerUp()
        if (this.getWarn() > 0)
            this.tickWarn()

        // If the timer is out, fetch the points again
        if (this.getTimer() <= 0) {
            if (this.isReqon()) { // Make sure there's not already a request since it's running async
                return
            }

            // Set the 'mutex' so it won't request twice
            this.setReqon(true)
            this.fetchPoints(() => {
                // Reset the timers when the fetch has finished
                this.setTimer(600)
                this.setTimerUp(0)
                // Also reset the mutex
                this.setReqon(false)
            })
        } else {
            // Display the current point count
            this.displayPoints(this.getPoints())
        }
    }

    // This is used in case we need to force an update, mainly used for the action button
    this.forceUpdate = function() {
        // Make sure to not be in a request
        if (this.isReqon()) {
            return
        }

        // We still have a cooldown for forced at 60s
        if (this.getTimerUp() >= 60) {
            this.setReqon(true)
            this.setTimer(0)
            this.fetchPoints(() => {
                this.setTimer(600)
                this.setTimerUp(0)
                this.setReqon(false)
            })
        } else {
            // If there's a cooldown on the forced, activate the warning
            this.setWarn(3)
        }
    }

    // Clears the display to the default placeholder, usually "Search" or other language equivalent
    this.clearDisplay = function() {
        this.setDisplay(this.getSearch())
    }

    // This fetches the points from the streamelements api
    this.fetchPoints = async function(callback) {
        // Make sure the current channel is supported, get out if not
        if (!this.isSupport()) return

        try {
            // Fetch and await the point URL /kappa/v2/points/<channel id>/<username>
            const response = await fetch(`https://api.streamelements.com/kappa/v2/points/${this.getChannelName()}/${this.getUserName()}`)
            // Make sure the request was successful
            if (!response.ok) {
                // If not, display the reason
                console.log("Failed to fetch points:", (response.statusText || "").length > 0 ? (`${response.status} - ${response.statusText}`) : (response.status))
                // Reset points to 0
                this.setPoints(0)
                // Still make sure to use the callback, since it's not dependent on the success
                if (typeof(callback) === "function") {
                    callback()
                }
            } else {
                // If fetch was successful, read the json fully and get the points
                const json = await response.json()
                const points = json.points

                // Update the points variable
                this.setPoints(points)
                // Use the callback
                if (typeof(callback) === "function") {
                    callback()
                }
            }
        } catch (error) {
            // If there was any error, log the error to console
            console.error("Points Fetch Failed:\n", error)
            // Reset points to 0
            this.setPoints(0)
            // Call the callback just like in the error above
            if (typeof(callback) === "function") {
                callback()
            }
        }
    }

    // Basically tells the caller if the user is logged in and detected as such
    this.isValid = function() {
        return typeof(this.getUserName()) === "string" && this.getUserName().length > 0
    }

    // Marks the current channel as "supported" which means their bot is valid and points for the bot is enabled
    // Takes the channel id, channel name, points name and a callback to call
    this.channelSupported = function(id, name, pname, callback) {
        window.channelName = name
        window.channelLink = location.href

        this.setPointName(pname.toUpperCase()[0] + pname.toLowerCase().substr(1))
        this.setChannelName(id)
        this.setPause(false)
        this.setSupport(true)

        if (typeof(callback) === "function") {
            callback()
        }
    }

    // Marks the current channel as "unsupported" which means either they aren't using a valid bot,
    //   their bot has points disabled, or any other issue that might arise
    this.channelUnsupported = function(name, reason) {
        if (typeof(name) === "string") {
            if (reason != null) {
                console.log("Unsupported Channel:",name,"\nReason:",reason)
            } else {
                console.log("Unsupported Channel:",name)
            }
        }
        window.channelName = name
        window.channelLink = location.href

        this.setChannelName(null)
        this.setPause(false)
        this.setSupport(false)
        this.clearDisplay()
    }

    // Fetches a new channel using the StreamElements api
    this.fetchChannel = async function(channelName, callback) {
        try {
            // Fetch the channels API as /kappa/v2/channels/<channel name>
            // What we want is the <channel id> and the <channel points name>
            let response = await fetch(`https://api.streamelements.com/kappa/v2/channels/${channelName}`)
            // Make sure the request was successful
            if (!response.ok) {
                // If not, get the reason
                let reason = undefined
                if (response.status != "404") { // If it wasn't a 404, log the actual error code and an option error text
                    console.log("Channel Points Error", `${response.status}${(response.statusText || "").length > 0 ? (` - ${response.statusText}`) : ""}`)
                } else { // If it was a 404, channel isn't using StreamElements
                    reason = "Channel not using StreamElements"
                }
                // Mark the channel as unsupported (this might be cached in the future)
                this.channelUnsupported(channelName, reason)
            } else {
                // Get the json if successful
                const json = await response.json()
                // Make sure the profile is valid
                if (json.statusCode == "404" || json.provider !== "twitch") {
                    // If it was 404 or provider isn't twitch, mark as unsupported with the reason provided
                    this.channelUnsupported(channelName, json.statusCode == "404" ? "StreamElements profile not found" : "wrong platform")
                } else {
                    // If it was valid, log the channel as supported
                    console.log("Supported Channel:",channelName)
                    // Also fetch their loyalty setup, which is what points are referred to
                    response = await fetch(`https://api.streamelements.com/kappa/v2/loyalty/${json._id}`)
                    // Make sure the request was successful
                    if (!response.ok) {
                        // If not, log the status and mark channel as unsupported
                        console.log("Channel Points Error", `${response.status}${(response.statusText || "").length > 0 ? (` - ${response.statusText}`) : ""}`)
                        this.channelUnsupported(channelName)
                    } else {
                        // If successful, read json fully
                        const loyaltyJson = await response.json()
                        // Make sure there's a loyalty element, and that loyalty is enabled
                        if (loyaltyJson != null && loyaltyJson.loyalty != null && loyaltyJson.loyalty.enabled == true) {
                            // Mark channel as supported, providing channel id, channel name, loyalty name (or default value if not set), and the callback
                            this.channelSupported(json._id, channelName, loyaltyJson.loyalty.name || "points", callback)
                        } else {
                            // If not, mark as unsupported, providing reason as points being disabled
                            this.channelUnsupported(channelName, "Channel Points Disabled")
                        }
                    }
                }
            }
        } catch (error) {
            // If there was any exceptional error, log the error and mark unsupported
            console.log("Channel Points Error",error)
            this.channelUnsupported(channelName)
        }
    }

    // Checks if the URL changed, and if so, re-fetches the new channel
    this.updateChannel = function(callback) {
        if (window.channelLink !== location.href) {
            let cname = location.href
            cname = cname.substr(cname.lastIndexOf("/") + 1)
            this.setPause(true)
            this.fetchChannel(cname, callback)
        }
    }

    // Called externally when the tab or url changes
    this.channelUpdate = function() {
        this.updateChannel(() => {
            // We're using forceUpdate for this, so make sure to forge the force-timer to be finished
            this.setTimerUp(61)
            this.forceUpdate()
        })
    }

    // Searches for and if found, returns the search box element to the caller
    this.getElement = function() {
        // If it already exists, return it
        if (typeof(this.e.get()) === "object" && this.e.get() != null) {
            return this.e.get()
        }

        // Search for and fetch the value
        const result = Array.from(document.querySelectorAll("input[type=\"search\"]")).filter(this.filterElement)[0]

        // Make sure it's a valid object
        if (typeof(result) === "object" && result != null) {
            // IF so, set it, and return it
            this._search.set(result.placeholder)
            return this.e.modify(result)
        } else {
            // Otherwise, simply return null
            return null
        }
    }

    // The filter callback from the function just above, called ``getElement``
    // It simply makes sure that the element is in the navbar's search box, and that it's not hidden (since the mobile version is there too but marked as hidden)
    this.filterElement = function(el) {
        const _el = el
        while(el.parentElement != el && (el = el.parentElement) != null) {
            if (el.getAttribute("data-a-target") === "nav-search-box") {
                if (!(_el.id || "").endsWith("hidden")) return true
            }
        }
        return false
    }

    // Fetches the currently logged-in username from the service worker
    this.preInit = function() {
        chrome.runtime.sendMessage({ label: "getName" }, response => {
            // Makes sure the response is valid
            if (typeof(response.data) === "string" && response.data.length > 0) {
                // If so, set the username and now look for the search bar
                this.setUserName(response.data)
                setTimeout(() => this.waitForSearch(), 0)
            } else {
                // If not, run this function again in 2 seconds
                setTimeout(() => this.preInit(), 2000)
            }
        })
    }

    // Searches for the search bar (no pun intended) until if finds it, and then calls ``postInit``
    this.waitForSearch = function() {
        const elem = this.getElement()
        if (typeof(elem) === "object" && elem != null) {
            console.log("Found search")
            this.postInit()
            return
        }
        setTimeout(() => this.waitForSearch(), 1000)
    }

    // The last initialization made upon first load, also has the main update loop, running every 1000ms
    this.postInit = function() {
        // Sets support to false by default
        this.setSupport(false)

        // Makes sure user is logged in (this might be uneccessary but keeping it just in case)
        if (!this.isValid()) {
            return
        }

        // Sets the loop interval
        setInterval(() => {
            if (!this.isPaused()) {
                this.updateTimer()
            }
        }, 1000)

        // Fetches the channel
        this.channelUpdate()
    }
}

// Create an instance of the tracker
// Using var here since it's running in an enclosed environment
var tracker = new PointTracker()

// The message handler reading messages from the service worker
function messageHandler(request, sender, sendResponse) {
    if (request.message === "tab_change") {
        // tab_change runs whenever the tab changes url, thus a channel fetch should be performed
        console.log("Url Changed:",request.url)
        tracker.channelUpdate()
    } else if (request.message === "action") {
        // action runs whenever the user presses the action button to the right of the search bar,
        //   thus the tracker should try to force a points update
        console.log("Force Update:",request.url)
        tracker.forceUpdate()
    }
}

// registers the message listener, and runs the preInit function
function onload() {
    chrome.runtime.onMessage.addListener(messageHandler)
    setTimeout(() => tracker.preInit(), 0)
}

// Runs the onload function after 0ms, using a timeout so that the function runs "when browser is ready"
setTimeout(onload, 0)