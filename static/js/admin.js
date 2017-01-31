var TcAdmin = (function () {
    var tc = {};

    /* DOM elements */
    var tcNavToday;
    var tcNavRange;
    var tcNavTotal;

    var tsTable;
    var tsHead;
    var tsDays = [];

    var userNewButton;
    var userNewForm;
    var userNewInputName;
    var userNewInputID;

    var userEditForm;
    var userEditInputName;
    var userEditInputID;

    var dbStatus;

    /* local variables */
    var focusDate;
    var periodStart;

    /* public variables */
    tc.initialDate;
    tc.lockDate;
    tc.slotIncrement;
    tc.slotFirstStart;
    tc.payPeriod;
    tc.payDay;

    tc.init = function () {
        tcNavToday = document.getElementById("tc-nav-today");
        tcNavRange = document.getElementById("tc-nav-range");
        tcNavTotal = document.getElementById("tc-nav-total");

        tsTable = document.getElementById("ts-table");
        tsHead = document.getElementById("ts-head");

        for (var i = 0; i < tc.payPeriod; i++) {
            tsDays.push(document.getElementById("ts-day-" + i));
        }

        userNewButton = document.getElementById("user-new-button");
        userNewForm = document.getElementById("user-new-form");
        userNewInputName = document.getElementById("user-new-input-name");
        userNewInputID = document.getElementById("user-new-input-id");

        userEditForm = document.getElementById("user-edit-form");
        userEditInputName = document.getElementById("user-edit-input-name");
        userEditInputID = document.getElementById("user-edit-input-id");

        dbStatus = document.getElementById("db-status");

        tc.currentWeek();
    }

    function getFromDatabase() {
        var get_dict = {
            "days": {}
        };

        for (var i = 0; i < tsDays.length; i++) {
            var lower = moment(tsDays[i].dataset.date).startOf("day").unix();
            var upper = moment(tsDays[i].dataset.date).endOf("day").unix();

            get_dict["days"]["ts-day-" + i] = [lower, upper];
        }

        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/update", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        // TODO: also set xhr.timeout and xhr.ontimeout?
        xhr.responseType = "json";
        xhr.onload = function () {
            getOnload(xhr.status, xhr.response);
        }
        xhr.send(JSON.stringify(get_dict));
    }

    function getOnload(status, response) {
        if (status == 200) {
            var oldTsBody = tsTable.children[1];
            var newTsBody = document.createElement("tbody");

            for (var elem in response) {
                var newRow = newTsBody.insertRow();

                var nameCell = newRow.insertCell(0);
                var nameString = response[elem]["lastname"] + ", " + response[elem]["firstname"];
                var nameText = document.createElement("div");
                nameText.setAttribute("class", "tc-link");
                nameText.setAttribute("onclick", "TcAdmin.userEditShow(\"" + response[elem]["firstname"] + " " + response[elem]["lastname"] + "\", \"" + elem + "\")");
                nameText.textContent = response[elem]["lastname"] + ", " + response[elem]["firstname"];
                nameCell.appendChild(nameText);

                var idCell = newRow.insertCell(1);
                idCell.textContent = elem;

                var lastModifiedCell = newRow.insertCell(2);
                lastModifiedCell.textContent = moment(response[elem]["lastmodified"]).from(tc.initialDate);

                for (var i = 0; i < tc.payPeriod; i++) {
                    var dayCell = newRow.insertCell();
                    // TODO: Same rounding error as everywhere else
                    dayCell.textContent = response[elem]["ts-day-" + i].toFixed(1);;
                }

                var totalCell = newRow.insertCell();
                totalCell.textContent = response[elem]["total"].toFixed(1);
            }

            tsTable.replaceChild(newTsBody, oldTsBody);
        } else {
            // TODO: Display error regarding status
        }
    }

    function navUpdate() {
        tcNavToday.disabled = focusDate.isSame(tc.initialDate, "day");

        var startDate = moment(tsDays[0].dataset.date)
        var endDate = moment(tsDays[tsDays.length - 1].dataset.date)
        if (startDate.isSame(endDate, "month")) {
            tcNavRange.textContent = startDate.format("MMM D") + " – " + endDate.format("D, YYYY");
        } else {
            tcNavRange.textContent = startDate.format("MMM D") + " – " + endDate.format("MMM D, YYYY");
        }
    }

    tc.currentWeek = function () {
        focusDate = moment(tc.initialDate);
        // TODO: Figure out how to get first day of current arbitrary pay period
        periodStart = moment(focusDate).startOf("week").subtract(1, "week").add(tc.payDay, "day");

        for (var i = 0; i < tsDays.length; i++) {
            tsUpdateDay(i);
        }

        navUpdate();

        getFromDatabase();
    }

    tc.prevWeek = function () {
        focusDate.subtract(tc.payPeriod, "day");
        periodStart = moment(focusDate); //.startOf("week");

        for (var i = 0; i < tsDays.length; i++) {
            tsUpdateDay(i);
        }

        navUpdate();

        getFromDatabase();
    }

    tc.nextWeek = function () {
        focusDate.add(tc.payPeriod, "day");
        periodStart = moment(focusDate); //.startOf("week");

        for (var i = 0; i < tsDays.length; i++) {
            tsUpdateDay(i);
        }

        navUpdate();

        getFromDatabase();
    }

    function tsUpdateDay(d) {
        var day = tsDays[d];
        var dayDate = moment(periodStart).add(d, "day");
        day.textContent = dayDate.format("MMM D"); //format("dddd, MMM D");
        day.dataset.date = dayDate.format("YYYY-MM-DD")
    }

    tc.userNewShow = function () {
        userNewButton.style.display = "none";
        userNewForm.style.display = "";
        userNewInputName.focus();
    }

    tc.userNewSubmit = function () {
        // Validate input, use dbStatus for response
        // Also validate server-side
        if (userNewInputName.value.length > 0 && userNewInputID.value.length > 0) {
            submitNewUser(userNewInputName.value, userNewInputID.value);
            tc.userNewCancel();
        } else {
            dbStatus.textContent = "Required fields: Name and ID";
        }
    }

    tc.userNewCancel = function () {
        userNewButton.style.display = "";
        userNewForm.style.display = "none";
        userNewInputName.value = "";
        userNewInputID.value = "";

        dbStatus.textContent = "";
    }

    function submitNewUser(name, id) {
        var user_dict = {
            "name": name,
            "id": id
        };

        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/create", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        // TODO: also set xhr.timeout and xhr.ontimeout?
        xhr.responseType = "json";
        xhr.onload = function () {
            submitNewUserOnload(xhr.status, xhr.response);
        }
        xhr.send(JSON.stringify(user_dict));
    }

    function submitNewUserOnload(status, response) {
        if (status == 200) {
            dbStatus.textContent = "User creation successful";
        } else {
            dbStatus.textContent = "Failed to create user (Error " + status + ")";
        }
        getFromDatabase();
    }

    tc.userEditShow = function (name, id) {
        tc.userNewCancel();
        
        userNewButton.style.display = "none";
        userEditForm.style.display = "";

        userEditForm.dataset.name = name;
        userEditForm.dataset.id = id;

        userEditInputName.value = name;
        userEditInputID.value = id;
        userEditInputName.focus();
    }

    tc.userEditSubmit = function () {
        // TODO: Make sure length > 0
        if (userEditInputName.value != userEditForm.dataset.name || userEditInputID.value != userEditForm.dataset.id) {
            submitEditUser(userEditInputName.value, userEditInputID.value);
            tc.userEditCancel();
        } else {
            dbStatus.textContent = "Modify a field to submit";
        }
    }

    tc.userEditCancel = function () {
        userNewButton.style.display = "";
        userEditForm.style.display = "none";
        userEditInputName.value = "";
        userEditInputID.value = "";

        userEditForm.dataset.name = "";
        userEditForm.dataset.id = "";

        dbStatus.textContent = "";
    }

    function submitEditUser(name, id) {
        var user_dict = {
            "id": userEditForm.dataset.id,
            "new_name": name,
            "new_id": id
        };

        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/edit", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        // TODO: also set xhr.timeout and xhr.ontimeout?
        xhr.responseType = "json";
        xhr.onload = function () {
            submitEditUserOnload(xhr.status, xhr.response);
        }
        xhr.send(JSON.stringify(user_dict));
    }

    function submitEditUserOnload(status, response) {
        if (status == 200) {
            dbStatus.textContent = "User successfully edited";
        } else {
            dbStatus.textContent = "Failed to edit user (Error " + status + ")";
        }
        getFromDatabase();
    }

    return tc;
})();
// Justin Carlson