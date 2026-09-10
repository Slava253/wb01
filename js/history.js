function escapeHtml(text) {

    return text.replace(
        /[&<>"']/g,

        function (symbol) {

            return {

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            }[symbol];

        }
    );

}


function renderHistory() {

    const search =
        document
            .getElementById("search")
            .value
            .trim()
            .toLowerCase();


    const history =
        PVZ.getHistory();


    const filtered =
        history.filter(
            function (item) {

                return item.code
                    .toLowerCase()
                    .includes(search);

            }
        );


    const list =
        document.getElementById(
            "historyList"
        );


    if (!filtered.length) {

        list.innerHTML =
            '<p class="muted">История пуста.</p>';

        return;

    }


    list.innerHTML =
        filtered.map(

            function (item, index) {

                return `

                    <div class="history-item">

                        <div>

                            <div class="history-code">
                                ${escapeHtml(item.code)}
                            </div>

                            <div class="history-date">
                                ${new Date(item.time)
                                    .toLocaleString("ru-RU")}
                            </div>

                        </div>

                        <button
                            class="button secondary"
                            data-copy="${index}">

                            Копировать

                        </button>

                    </div>

                `;

            }

        ).join("");


    list
        .querySelectorAll("[data-copy]")
        .forEach(

            function (button, index) {

                button.onclick =
                    function () {

                        navigator.clipboard
                            .writeText(
                                filtered[index].code
                            );

                    };

            }

        );

}


/* ЗАПУСК */

document.addEventListener(
    "DOMContentLoaded",
    function () {


        renderHistory();


        /*
         * ПОИСК
         */

        document
            .getElementById("search")
            .oninput =
            renderHistory;


        /*
         * ОЧИСТИТЬ
         */

        document
            .getElementById("clearHistory")
            .onclick =
            function () {

                if (
                    confirm(
                        "Удалить всю историю?"
                    )
                ) {

                    PVZ.setHistory([]);

                    renderHistory();

                }

            };


        /*
         * ЭКСПОРТ
         */

        document
            .getElementById("export")
            .onclick =
            function () {

                const history =
                    PVZ.getHistory();


                const text =
                    history
                        .map(

                            function (item) {

                                return (
                                    new Date(item.time)
                                        .toLocaleString("ru-RU")
                                    + " — "
                                    + item.code
                                );

                            }

                        )
                        .join("\n");


                const blob =
                    new Blob(
                        [text],
                        {
                            type:
                                "text/plain;charset=utf-8"
                        }
                    );


                const link =
                    document.createElement("a");


                link.href =
                    URL.createObjectURL(blob);


                link.download =
                    "pvz-history.txt";


                link.click();


                URL.revokeObjectURL(
                    link.href
                );

            };

    }
);
