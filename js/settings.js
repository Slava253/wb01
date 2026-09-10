document.addEventListener(
    "DOMContentLoaded",
    function () {

        const settings =
            PVZ.getSettings();


        const sound =
            document.getElementById(
                "sound"
            );

        const autosave =
            document.getElementById(
                "autosave"
            );

        const dark =
            document.getElementById(
                "dark"
            );


        sound.checked =
            settings.sound;

        autosave.checked =
            settings.autosave;

        dark.checked =
            settings.dark;


        /*
         * ЗВУК
         */

        sound.onchange =
            function () {

                localStorage.setItem(
                    "pvz_sound",
                    sound.checked
                );

            };


        /*
         * АВТОСОХРАНЕНИЕ
         */

        autosave.onchange =
            function () {

                localStorage.setItem(
                    "pvz_autosave",
                    autosave.checked
                );

            };


        /*
         * ТЁМНАЯ ТЕМА
         */

        dark.onchange =
            function () {

                localStorage.setItem(
                    "pvz_dark",
                    dark.checked
                );


                document.body.classList
                    .toggle(
                        "dark",
                        dark.checked
                    );

            };

    }
);
