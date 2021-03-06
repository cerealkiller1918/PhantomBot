/*
 * Copyright (C) 2016 www.phantombot.net
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* 
 * @author IllusionaryOne
 */

/*
 * timePanel.js
 * Drives the Time Panel
 */
(function() {

    var sortType = 'alpha_asc',
        timeLevel = "",
        keepTimeWhenOffline = "",
        modTimePermToggle = "",
        commandName = "",
        modeIcon = [];
        modeIcon['false'] = "<i style=\"color: #6136b1\" class=\"fa fa-circle-o\" />";
        modeIcon['true'] = "<i style=\"color: #6136b1\" class=\"fa fa-circle\" />";

    /*
     * onMessage
     * This event is generated by the connection (WebSocket) object.
     */
    function onMessage(message) {
        var msgObject,
            timezone = "GMT"; // Default time zone in Core if none given.

        try {
            msgObject = JSON.parse(message.data);
        } catch (ex) {
            return;
        }

        if (panelHasQuery(msgObject)) {

            if (panelCheckQuery(msgObject, 'time_toplist')) {
                $("#topListAmountTime").attr("placeholder", msgObject['results']['topListAmountTime']).blur();
            }
 
            if (panelCheckQuery(msgObject, 'time_timezone')) {
                if (msgObject['results']['timezone'] != undefined) {
                    timezone = msgObject['results']['timezone'];
                }
                $("#setTimeZoneInput").attr("placeholder", timezone).blur();
            }

            if (panelCheckQuery(msgObject, 'time_settings')) {
                for (idx in msgObject['results']) {
                    commandName = msgObject['results'][idx]['key'];
                    if (panelMatch(commandName, 'timeLevel')) {
                        timeLevel = msgObject['results'][idx]['value'];
                        $("#timeLevel").html(modeIcon[timeLevel]);
                        continue;
                    }

                    if (panelMatch(commandName, 'keepTimeWhenOffline')) {
                        keepTimeWhenOffline = msgObject['results'][idx]['value'];
                        $("#keepTimeWhenOffline").html(modeIcon[keepTimeWhenOffline]);
                        continue;
                    }

                    if (panelMatch(commandName, 'modTimePermToggle')) {
                        modTimePermToggle = msgObject['results'][idx]['value'];
                        $("#modTimePermToggle").html(modeIcon[modTimePermToggle]);
                        continue;
                    }
                }
            }

            if (panelCheckQuery(msgObject, 'time_settings2')) {
                for (idx in msgObject['results']) {
                    var key = "",
                        value = "";

                    key = msgObject['results'][idx]['key'];
                    value = msgObject['results'][idx]['value'];
    
                    if (panelMatch(key, 'timePromoteHours')) {
                        $("#setTimePromotionInput").attr("placeholder", value).blur();
                    }
                }
            }

            if (panelCheckQuery(msgObject, 'time_timetable')) {
                var timeTableData = msgObject['results'],
                    username = "",
                    timeValue = "",
                    hrsValue = "",
                    html = "";

                if (panelMatch(sortType, 'time_asc')) {
                    timeTableData.sort(sortTimeTable_time_asc);
                } else if (panelMatch(sortType, 'time_desc')) {
                    timeTableData.sort(sortTimeTable_time_desc);
                } else if (panelMatch(sortType, 'alpha_asc')) {
                    timeTableData.sort(sortTimeTable_alpha_asc);
                } else if (panelMatch(sortType, 'alpha_desc')) {
                    timeTableData.sort(sortTimeTable_alpha_desc);
                }

                html = "<table>";
                for (var idx = 0; idx < timeTableData.length; idx++) {
                    username = timeTableData[idx]['key'];
                    timeValue = timeTableData[idx]['value'];
                    hrsValue = "(" + Math.floor(timeValue / 3600) + " hrs)";
                    html += "<tr class=\"textList\">" +
                            "    <td style=\"vertical-align: middle; width: 50%\">" + username + "</td>" +
                            "    <td style=\"vertical-align: middle; width: 25%\">" + timeValue + " " + hrsValue +"</td>" +
                            "    <td style=\"vertical-align: middle: width: 25%\">" +
                            "    <form onkeypress=\"return event.keyCode != 13\">" +
                            "        <input type=\"number\" min=\"0\" id=\"inlineUserTime_" + username + "\"" +
                            "               placeholder=\"" + timeValue + "\" value=\"" + timeValue + "\"" +
                            "               style=\"width: 8em\"/>" +
                            "        <button type=\"button\" class=\"btn btn-default btn-xs\" onclick=\"$.updateUserTime('" + username + "')\"><i class=\"fa fa-pencil\" /></button>" +
                            "    </form>" +
                            "</tr>";
                }
                html += "</table>";

                setTimeout(function () {
                    $("#userTimeTable").html(html);
                }, 500);
                handleInputFocus();
            }
        }
    }

    /**
     * @function doQuery
     */
    function doQuery() {
        sendDBQuery("time_timezone", "settings", "timezone");
        sendDBQuery("time_toplist", "settings", "topListAmountTime");
        sendDBKeys("time_settings2", "timeSettings");
        sendDBKeys("time_settings", "timeSettings");
        sendDBKeys("time_timetable", "time");
    }

    /**
     * @function updateUserTime
     * @param {String} username
     */
    function updateUserTime(username) {
        var timeValue = $("#inlineUserTime_" + username).val();
        if (timeValue.length > 0) {
            $("#inlineUserTime_" + username).val('')
            sendDBUpdate("time_timetableUpdate", "time", username, timeValue);
            setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME);
        }
    }

    /**
     * @function sortTimeTable
     * @param {Object} a
     * @param {Object} b
     */
    function sortTimeTable_alpha_desc(a, b) {
        return panelStrcmp(b.key, a.key);
    }
    function sortTimeTable_alpha_asc(a, b) {
        return panelStrcmp(a.key, b.key);
    }
    function sortTimeTable_time_asc(a, b) {
        return parseInt(a.value) - parseInt(b.value);
    }
    function sortTimeTable_time_desc(a, b) {
        return parseInt(b.value) - parseInt(a.value);
    }

    /**
     * @function toggleTimeMode
     * @param {String} divId
     * @param {String} setting
     */
    function toggleTimeMode(divId, setting) {
        $("#" + divId).html("<i style=\"color: #6136b1\" class=\"fa fa-spinner fa-spin\" />");
        if (setting == "modTimePermToggle") {
            if (modTimePermToggle == "false") {
                sendDBUpdate("time_toggles", "timeSettings", setting, "true");
            } else {
                sendDBUpdate("time_toggles", "timeSettings", setting, "false");
            }
        }

        if (setting == "keepTimeWhenOffline") {
            if (keepTimeWhenOffline == "false") {
                sendDBUpdate("time_toggles", "timeSettings", setting, "true");
            } else {
                sendDBUpdate("time_toggles", "timeSettings", setting, "false");
            }
        }

        if (setting == "timeLevel") {
            if (timeLevel == "false") {
                sendDBUpdate("time_toggles", "timeSettings", setting, "true");
            } else {
                sendDBUpdate("time_toggles", "timeSettings", setting, "false");
            }
        }

        setTimeout(function() { sendCommand("updatetimesettings"); }, TIMEOUT_WAIT_TIME);
        setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME);
    }

    /**
     * @function setTimePromotion
     */
    function setTimePromotion() {
        var newTimePromotion = $("#setTimePromotionInput").val();
        if (newTimePromotion.length > 0) {
            sendDBUpdate("time_toggles", "timeSettings", "timePromoteHours", newTimePromotion);
            $("#setTimePromtionInput").val('');
            $("#setTimePromotionInput").attr("placeholder", "Submitting").blur();
            setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME);
        }
    }

    /**
     * @function setTimeZone
     */
    function setTimeZone() {
        var newTimeZone = $("#setTimeZoneInput").val();
        if (newTimeZone.length > 0) {
            sendDBUpdate("time_toggles", "settings", "timezone", newTimeZone);
            $("#setTimeZoneInput").val('');
            $("#setTimeZoneInput").attr("placeholder", "Submitting").blur();
            setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME);
        }
    }

    /**
     * @function modifyUserTime
     * @param {String} action
     */
    function modifyUserTime(action) {
        var username = $("#adjustUserTimeNameInput").val(),
            timeAdjust = $("#adjustUserTimeSecsInput").val();

        if (action == "take") {
            if (username.length > 0 && timeAdjust.length > 0) {
                sendDBDecr("times", "time", username, timeAdjust);
            }
        }

        if (action == "add") {
            if (username.length > 0 && timeAdjust.length > 0) {
                sendDBIncr("times", "time", username, timeAdjust);
            }
        }

        if (action == "set") {
            if (username.length > 0 && timeAdjust.length > 0) {
                sendDBUpdate("times", "time", username, timeAdjust);
            }
        }
        $("#adjustUserTimeNameInput").val("Submitting");
        $("#adjustUserTimeSecsInput").val("Submitting");
        setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME);
        setTimeout(function() {
            $("#adjustUserTimeNameInput").val("");
            $("#adjustUserTimeSecsInput").val("");
        }, TIMEOUT_WAIT_TIME);
    }

    /**
     * @function setTimeSort
     * @param {String} type
     */
    function setTimeSort(type) {
        sortType = type;
        doQuery();
    }

    /**
     * @function topListTime
     */
    function topListTime() {
        var val = $("#topListAmountTime").val();
        if (val.length != 0) {
            sendDBUpdate("time_toplist", "settings", "topListAmountTime", val);
        }
        setTimeout(function() { doQuery(); }, TIMEOUT_WAIT_TIME);
        setTimeout(function() { sendCommand('reloadtop'); }, TIMEOUT_WAIT_TIME);
    };

    // Import the HTML file for this panel.
    $("#timePanel").load("/panel/time.html");

    // Load the DB items for this panel, wait to ensure that we are connected.
    var interval = setInterval(function() {
        if (isConnected && TABS_INITIALIZED) {
            var active = $("#tabs").tabs("option", "active");
            if (active == 3) {
                doQuery();
                clearInterval(interval);
            }
        }
    }, INITIAL_WAIT_TIME);

    // Query the DB every 30 seconds for updates.
    setInterval(function() {
        var active = $("#tabs").tabs("option", "active");
        if (active == 3 && isConnected && !isInputFocus()) {
            newPanelAlert('Refreshing Time Data', 'success', 1000);
            doQuery();
        }
    }, 3e4);

    // Export functions - Needed when calling from HTML.
    $.timeOnMessage = onMessage;
    $.timeDoQuery = doQuery;
    $.toggleTimeMode = toggleTimeMode;
    $.setTimePromotion = setTimePromotion;
    $.setTimeZone = setTimeZone;
    $.modifyUserTime = modifyUserTime;
    $.updateUserTime = updateUserTime;
    $.setTimeSort = setTimeSort;
    $.topListTime = topListTime;
})();
