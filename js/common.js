const PVZ = {

    getHistory: function () {

        try {

            return JSON.parse(
                localStorage.getItem("pvz_history") || "[]"
            );

        } catch (error) {

            return [];

        }

    },


    setHistory: function (items) {

        localStorage.setItem(
            "pvz_history",
            JSON.stringify(items)
        );

    },


    add: function (code) {

        const clean = String(code).trim();

        if (!clean) {
            return;
        }

        const items = this.getHistory();

        items.unshift({

            code: clean,

            time: new Date().toISOString()

        });

        this.setHistory(
            items.slice(0, 500)
        );

    },


    getSettings: function () {

        return {

            sound:
                localStorage.getItem("pvz_sound")
                !== "false",

            autosave:
                localStorage.getItem("pvz_autosave")
                !== "false",

            dark:
                localStorage.getItem("pvz_dark")
                === "true"

        };

    },


    beep: function () {

        const settings =
            this.getSettings();

        if (!settings.sound) {
            return;
        }

        try {

            const Audio =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!Audio) {
                return;
            }

            const context =
                new Audio();

            const oscillator =
                context.createOscillator();

            const gain =
                context.createGain();

            oscillator.frequency.value = 880;

            gain.gain.value = 0.06;

            oscillator.connect(gain);

            gain.connect(context.destination);

            oscillator.start();

            oscillator.stop(
                context.currentTime + 0.12
            );

        } catch (error) {

            console.log(
                "Звук недоступен"
            );

        }

    },


    applyTheme: function () {

        const settings =
            this.getSettings();

        if (settings.dark) {

            document.body.classList.add(
                "dark"
            );

        }

    }

};


document.addEventListener(
    "DOMContentLoaded",
    function () {

        PVZ.applyTheme();

    }
);
