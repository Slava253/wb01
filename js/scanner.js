let scanner = null;

let cameraRunning = false;

let lastCode = "";


function $(id) {

    return document.getElementById(id);

}


/* ПОКАЗАТЬ РЕЗУЛЬТАТ */

function showResult(code, automatic) {

    const clean =
        String(code).trim();

    if (!clean) {
        return;
    }

    lastCode = clean;


    $("result").className =
        "result-value";

    $("result").textContent =
        clean;


    $("copyButton").disabled =
        false;

    $("saveButton").disabled =
        false;


    $("scanMessage").textContent =
        "Код успешно распознан.";


    $("cameraState").textContent =
        "Код найден";


    PVZ.beep();


    if (
        automatic &&
        PVZ.getSettings().autosave
    ) {

        PVZ.add(clean);

    }

}


/* ЗАПУСК КАМЕРЫ */

async function startCamera() {

    if (
        typeof Html5Qrcode ===
        "undefined"
    ) {

        $("scanMessage").textContent =
            "Сканер ещё загружается. Проверьте интернет и обновите страницу.";

        return;

    }


    if (cameraRunning) {
        return;
    }


    scanner =
        new Html5Qrcode("reader");


    try {

        const cameras =
            await Html5Qrcode.getCameras();


        if (!cameras.length) {

            throw new Error(
                "Камера не найдена"
            );

        }


        /*
         * Берём первую доступную камеру.
         */

        const cameraId =
            cameras[0].id;


        await scanner.start(

            cameraId,

            {
                fps: 10,

                qrbox: {
                    width: 250,
                    height: 250
                }

            },

            function (decodedText) {

                showResult(
                    decodedText,
                    true
                );

            },

            function () {

                // Ничего не делаем,
                // когда код не найден.

            }

        );


        cameraRunning = true;


        $("startButton").disabled =
            true;

        $("stopButton").disabled =
            false;


        $("cameraState").textContent =
            "Камера включена";


        $("scanMessage").textContent =
            "Наведите камеру на QR-код.";

    }

    catch (error) {

        $("cameraState").textContent =
            "Ошибка";


        $("scanMessage").textContent =
            "Не удалось запустить камеру: "
            + error.message;


        try {

            await scanner.clear();

        } catch (_) {}


        scanner = null;

    }

}


/* ОСТАНОВКА */

async function stopCamera() {

    if (!scanner) {
        return;
    }


    try {

        await scanner.stop();

        await scanner.clear();

    } catch (error) {

        console.log(error);

    }


    scanner = null;

    cameraRunning = false;


    $("startButton").disabled =
        false;

    $("stopButton").disabled =
        true;


    $("cameraState").textContent =
        "Остановлена";


    $("scanMessage").textContent =
        "Камера остановлена.";

}


/* ПРИ ЗАГРУЗКЕ */

document.addEventListener(
    "DOMContentLoaded",
    function () {


        $("startButton").onclick =
            startCamera;


        $("stopButton").onclick =
            stopCamera;


        /*
         * РУЧНОЙ ВВОД
         */

        $("manualForm").onsubmit =
            function (event) {

                event.preventDefault();


                const value =
                    $("manualInput").value;


                if (value.trim()) {

                    showResult(
                        value,
                        false
                    );

                }

            };


        /*
         * КОПИРОВАНИЕ
         */

        $("copyButton").onclick =
            async function () {

                if (!lastCode) {
                    return;
                }


                try {

                    await navigator
                        .clipboard
                        .writeText(lastCode);


                    $("scanMessage").textContent =
                        "Код скопирован.";

                }

                catch (error) {

                    $("scanMessage").textContent =
                        "Не удалось скопировать код.";

                }

            };


        /*
         * СОХРАНЕНИЕ
         */

        $("saveButton").onclick =
            function () {

                if (!lastCode) {
                    return;
                }


                PVZ.add(lastCode);


                $("scanMessage").textContent =
                    "Код сохранён в историю.";

            };

    }
);
