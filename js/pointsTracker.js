function startPointTracker() {
    if (window['_ktnse'] !== true) {
        const ktn = {
            e: document.querySelector("input[aria-label=\"Search Input\"]"),
            getDisplay: function() {
                return this.e.placeholder
            },
            setDisplay: function(data) {
                this.e.placeholder = data
            },
            setPoints: function(data) {
                if (typeof(data) !== "number") {
                    this.clearDisplay()
                    return
                }
                if (typeof(this._timer) === "number" && this._timer > 0) {
                    this.setDisplay(`Points: ${this._points} | Updates in ${this._timer}s`)
                } else {
                    this._points = data
                    this.setDisplay(`Points: ${data}`)
                }
            },
            updateTimer: function() {
                if (typeof(window._channel) !== "string" || !window._support) return
                this._timer = (this._timer || 0) - 1
                this._timerup = (this._timerup || -1) + 1
                if (typeof(this._points) !== "number" || this._timer <= 0) {
                    if (this._reqon === true) {
                        return
                    }
                    this._reqon = true
                    this.fetchPoints(() => {
                        this._timer = 600
                        this._timerup = 0
                        window._ktnroot._reqon = false
                    })
                } else {
                    this.setPoints(this._points)
                }
            },
            forceUpdate: function() {
                if (this._reqon === true) {
                    return
                }
                if (typeof(this._timerup) === "number" && this._timerup >= 60) {
                    this._reqon = true
                    this._timer = 0
                    this.fetchPoints(() => {
                        this._timer = 600
                        this._timerup = 0
                        this._reqon = false
                    })
                }
            },
            getPoints: function() {
                return this._points || 0
            },
            clearDisplay: function() {
                this.setDisplay("Search")
            },
            showPoints: function(data) { // Not used atm
                this.setPoints(data)
                setTimeout(() => this.clearDisplay(), 5000)
            },
            fetchPoints: function(callback) {
                if (!window._support) return
                fetch(`https://api.streamelements.com/kappa/v2/points/${window._channel}/${window._ktnname}`).then(p => p.json()).then(p => p.points)
                .then(points => {
                    this.setPoints(points)
                    if (typeof(callback) === "function") {
                        callback()
                    }
                })
            },
            isValid: function() {
                return typeof(window._ktnname) === "string" && window._ktnname.length > 0
            },
            updateChannel: function(callback) {
                if (window.channelLink !== location.href) {
                    let cname = location.href
                    cname = cname.substr(cname.lastIndexOf("/")+1)
                    window._ktnpause = true
                    fetch(`https://api.streamelements.com/kappa/v2/channels/${cname}`).then(p => p.json()).then(p => p._id)
                    .then(p => {
                        window.channelName = cname
                        window.channelLink = location.href
                        window._channel = p
                        window._ktnpause = false
                        window._support = true
                        if (typeof(callback) === "function") {
                            callback()
                        }
                    })
                    .catch((error) => {
                        window.channelName = cname
                        window.channelLink = location.href
                        window._channel = p
                        window._ktnpause = false
                        window._support = false
                        this.clearDisplay()
                    })
                }
            }
        }

        window._support = false
        window['_ktnse'] = true
        window['_ktnroot'] = ktn

        if (!ktn.isValid()) {
            return
        }

        setInterval(() => {
            if (!window._ktnpause) {
                ktn.updateTimer()
                ktn.updateChannel(() => {
                    ktn._timerup = 61
                    ktn.forceUpdate()
                })
            }
        }, 1000)
    }
}

function initTracker() {
    chrome.runtime.sendMessage({label: "getName"}, function(response) {
        if (typeof(response.data) === "string" && response.data.length > 0) {
            window._ktnname = response.data
            setTimeout(startPointTracker, 0)
        } else {
            setTimeout(initTracker, 2000)
        }
    })
}

setTimeout(initTracker, 0)