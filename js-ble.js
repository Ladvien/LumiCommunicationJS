//https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTServer
var log = console.log;
var writeCharacteristic;
var descriptor;
var receivedString = "";
var terminalLineCounter = 0;
var displayDOM = 'terminal';

let primaryService = document.getElementById('optionalServices').value;

var terminal = new Terminal(displayDOM);

function onScanButtonClick() {
  lumiBle.searchAndConnect(0xFFE0);
}

function onReceivedData(event){
    for(var i = 0; i < event.target.value.byteLength; i ++){
        receivedString += String.fromCharCode(event.target.value.getUint8(i));
    }
    addTerminalLine(displayDOM, receivedString, '<- ', 'received-text');
    receivedString = "";
}

function onWriteButtonClick(){
    if(writeCharacteristic != null){
        let encoder = new TextEncoder('utf-8');
        let textToWrite = document.getElementById('textToWrite').value;
        writeCharacteristic.writeValue(encoder.encode(textToWrite))
        .then(_ => {
            addTerminalLine(displayDOM, textToWrite, '-> ', 'sent-text');
        })
    }
}



/* Utils */

function addSystemText(text){
    addTerminalLine(displayDOM, text, '-) ', 'system-text');
}

function getSupportedProperties(characteristic) {
  let supportedProperties = [];
  for (const p in characteristic.properties) {
    if (characteristic.properties[p] === true) {
      supportedProperties.push(p.toUpperCase());
    }
  }
  return '[' + supportedProperties.join(', ') + ']';
}

document.getElementById('btn-1').onclick = onScanButtonClick;
document.getElementById('btn-write-ble').onclick = onWriteButtonClick;

var LumiBluetooth = function(){
       // Searchs for Devices based upon Service IDs.  Then prompts
    // a user to select a target device.  Lastly, it conencts to
    // target d evice.
    this.searchAndConnect = function(primaryServicesUUID){
        let optionalServices = document.getElementById('optionalServices').value
            .split(/, ?/).map(s => s.startsWith('0x') ? parseInt(s) : s)
            .filter(s => s && BluetoothUUID.getService);

        addSystemText('Requesting any Bluetooth Device...');

          navigator.bluetooth.requestDevice({
              acceptAllDevices: true,
              optionalServices: optionalServices})
          .then(device => {
              addSystemText('Connecting to GATT Server...');
              return device.gatt.connect();
          })
          .then(server => {
              addSystemText('Getting Services...');
//              return server.getPrimaryServices(0xFFE0);
                return server.getPrimaryServices(primaryServicesUUID);
          })
        .then(services =>{
              addSystemText("Found services: ")  
              services.forEach(service => {
                  let queue = Promise.resolve();
                  queue = queue.then(_ => service.getCharacteristics().then(characteristics => {
                      addSystemText('> Service: ' + service.uuid);
                      characteristics.forEach(characteristic => {
                          addSystemText('>> Characteristic: ' + characteristic.uuid + ' ' +
                                        getSupportedProperties(characteristic));
                          writeCharacteristic = characteristic;
                          addSystemText("Write characteristic set");
                          writeCharacteristic.addEventListener('characteristicvaluechanged', onReceivedData);
                          writeCharacteristic.startNotifications();           characteristic.getDescriptors('gatt.characteristic_user_description').then(descriptors => {
                              descriptor = descriptors[0];
                        });
                    });
              }));
            })
        })
    }
}

var lumiBle = new LumiBluetooth();
