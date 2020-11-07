const bleno = require('bleno');
const debug = require('debug');
const trace = debug('fortiusant:ibdc');

const CharacteristicUserDescription = '2901';
const ClientCharacteristicConfiguration = '2902';
const ServerCharacteristicConfiguration = '2903';
const IndoorBikeData = '2AD2';

function bit(nr) {
  return (1 << nr);
}

const InstantaneousCadencePresent = bit(2);
const InstantaneousPowerPresent = bit(6);
const HeartRatePresent = bit(9);

class IndoorBikeDataCharacteristic extends  bleno.Characteristic {
  constructor() {
    trace('[IndoorBikeDataCharacteristic] constructor')
    super({
      uuid: IndoorBikeData,
      properties: ['notify'],
      descriptors: [
        new bleno.Descriptor({
          uuid: CharacteristicUserDescription,
          value: 'Indoor Bike Data'
        }),
        new bleno.Descriptor({
          uuid: ClientCharacteristicConfiguration,
          value: Buffer.alloc(2)
        }),
        new bleno.Descriptor({
          uuid: ServerCharacteristicConfiguration,
          value: Buffer.alloc(2)
        })
      ]
    });
    this.updateValueCallback = null;  
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    trace('[IndoorBikeDataCharacteristic] onSubscribe');
    this.updateValueCallback = updateValueCallback;
    return this.RESULT_SUCCESS;
  };

  onUnsubscribe() {
    trace('[IndoorBikeDataCharacteristic] onUnsubscribe');
    this.updateValueCallback = null;
    return this.RESULT_UNLIKELY_ERROR;
  };

  notify(event) {
    trace('[IndoorBikeDataCharacteristic] notify');

    let flags = 0;
    let offset = 0;
    let buffer = new Buffer.alloc(30);

    let flagField = buffer.slice(0, offset);
    offset += 2;

    // Instantaneous speed, always 0 ATM
    offset += 2;

    if ('cadence' in event) {
      flags |= InstantaneousCadencePresent;
      // cadence is in 0.5rpm resolution but is supplied in 1rpm resolution, multiply by 2 for ble.
      let cadence = event.cadence * 2
      trace('[IndoorBikeDataCharacteristic] cadence(rpm): ' + cadence + ' (' + event.cadence + ')');
      buffer.writeUInt16LE(cadence, offset);
      offset += 2;
    }
    
    if ('watts' in event) {
      flags |= InstantaneousPowerPresent;
      let watts = event.watts;
      trace('[IndoorBikeDataCharacteristic] power(W): ' + watts);
      buffer.writeInt16LE(watts, offset);
      offset += 2;
    }

    // Zwift doesn't seem to detect the heart rate in the FTMS protobol. Instead,
    // the heart rate service is used now.
    //
    // if ('heart_rate' in event) {
    //   flags |= HeartRatePresent;
    //   let heart_rate = event.heart_rate;
    //   trace('[IndoorBikeDataCharacteristic] heart rate(bpm): ' + heart_rate);
    //   buffer.writeUInt16LE(heart_rate, offset);
    //   offset += 2;
    // }

    // Write the flags
    flagField.writeUInt16LE(flags);

    let finalbuffer = buffer.slice(0, offset);
    trace(finalbuffer);

    if (this.updateValueCallback) {
      this.updateValueCallback(finalbuffer);
    }

    return this.RESULT_SUCCESS;
  }
};

module.exports = IndoorBikeDataCharacteristic;
