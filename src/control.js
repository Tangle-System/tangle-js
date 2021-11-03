import { tangleDevice } from "./main.js";


// Just to make blockly interactive first and let libraries load in the background

const content_control = document.querySelector("#content_control");
const control_percentage_range = document.querySelector("#control_percentage_range");
const control_destination = document.querySelector("#control_destination");
const control_send = document.querySelector("#control_send");

const event_logs = document.querySelector("#event_logs");
const control_label = document.querySelector("#control_label");
const control_percentage_value = document.querySelector("#control_percentage_value");
const control_timestamp_value  = document.querySelector("#control_timestamp_value");
const control_color_value  = document.querySelector("#control_color_value");
const control_color_picker  = document.querySelector("#control_color_picker");

// CONTROL TYPE HANDLER
let currentControlType = "percentage_control";
document.querySelector("#control_type").onchange = e => {
  const controlType = e.target.options[e.target.selectedIndex].value;
  // Hide other controls
  document.querySelector(`#${currentControlType}`).style.display = "none";
  document.querySelector(`#${controlType}`).style.display = "block";

  currentControlType = controlType
}

control_label.onchange = e => {
  control_label.value = control_label.value.replace(/\W/g, "");
  control_label.value = control_label.value.substring(0, 5);
};

control_color_picker.oninput = e => {
  control_color_value.value = control_color_picker.value;
}

control_color_value.oninput = e => {
  control_color_picker.value = getHexColor(control_color_value.value);
}


function handlePercentageValueChange(e) {
  const value = e.target.value;
  handleControlSend(value);
}

function handleColorValueChange(e) {
  const value = e.target.value;
  handleControlSend(value);
}

function handleControlSend(value=null) {
  let log_value = "";
  if (currentControlType === "percentage_control") {
    if (value === null) {
      log_value = control_percentage_value.value + '%';
      tangleDevice.emitPercentageEvent(control_label.value, parseFloat(control_percentage_value.value), control_destination.value);
    } else {
      log_value = value + "%";
      tangleDevice.emitPercentageEvent(control_label.value, parseFloat(value), control_destination.value);
    }
  } else if (currentControlType === "color_control") {
    // if (!value) {
    const hexColor = getHexColor(document.querySelector("#control_color_value").value);
    log_value = `<span style="color:${hexColor}">` + hexColor + `</span>`;
    tangleDevice.emitColorEvent(control_label.value, hexColor, control_destination.value);
    // } else {
    // tangleDevice.bluetoothDevice.emitColorEvent(control_label.value, value, control_destination.value);
    // }
  } else if (currentControlType === "timestamp_control") {
    log_value = control_timestamp_value.value + " ms";
    // TODO parse timeparams (x seconds, x minutes, x hours, x days), like in block
    tangleDevice.emitTimeEvent(control_label.value, control_timestamp_value.value, control_destination.value);
  }

  const logmessageDOM = document.createElement("li");
  // TODO edit this message accordingly to each control type
  logmessageDOM.innerHTML = `${new Date().toString().slice(15, 24)} ${currentControlType}: $${control_label.value}, ${log_value} -> ${control_destination.value}`;
  event_logs.appendChild(logmessageDOM);
  event_logs.scrollTop = -999999999;
}

control_percentage_range.oninput = handlePercentageValueChange;
control_color_picker.onchange = handleColorValueChange;

control_send.onclick = (e) => handleControlSend();






function getHexColor(colorStr) {
  const a = document.createElement("div");
  a.style.color = colorStr;
  const colors = window
    .getComputedStyle(document.body.appendChild(a))
    .color.match(/\d+/g)
    .map(function (a) {
      return parseInt(a, 10);
    });
  document.body.removeChild(a);
  return colors.length >= 3
    ? "#" +
    ((1 << 24) + (colors[0] << 16) + (colors[1] << 8) + colors[2])
      .toString(16)
      .substr(1)
    : false;
}
