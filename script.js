const scanButton = document.getElementById("scanButton");
const clearButton = document.getElementById("clearButton");

const scannerBox = document.getElementById("scanner-box");
const resultBox = document.getElementById("resultBox");

scanButton.addEventListener("click", function () {

    scannerBox.classList.add("scanning");

    resultBox.textContent = "Сканирование...";

    setTimeout(function () {

        scannerBox.classList.remove("scanning");

        resultBox.textContent = "Сканирование готово";

    }, 2000);
});


clearButton.addEventListener("click", function () {

    resultBox.textContent = "Код ещё не отсканирован";

});
