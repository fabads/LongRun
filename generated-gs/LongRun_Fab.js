var LongRun = class LongRun {
  constructor(settings={}) {
    this._triggerKeyPropertyName = `${this.constructor.name}TriggerId`;
    this._nextIterationPropertyName = `${this.constructor.name}NextIteration`;
    this._settingsPropertyName = `${this.constructor.name}Settings`;
    this._startTime = 0;
    
    // Set Default settings
    this._defaults = {
      iterations: 1,
      maxExecutionSeconds: 4 * 60,
      delayMinutes: 1,
      mainProcess: '',
      initializer: '',
      finalizer: '',
      args: ''
    };

    this._properties = PropertiesService.getScriptProperties();
    
    // Retrieve settings in Script Properties (or empty object if not found)
    var propertiesSettings = JSON.parse(this._properties.getProperty(this._settingsPropertyName) || '{}'); 

    // Set options defined in Script Properties. Use default options when not defined
    this._defaults = Object.assign({}, this._defaults, propertiesSettings);

    // Set options defined by user. Use default options when not specified
    this._settings = Object.assign({}, this._defaults, settings);

    // Write back options in Script Properties
    this._properties.setProperty(this._settingsPropertyName, JSON.stringify(this._settings));

    // Get current value of next iteration if available in Script properties, first iteration otherwise
    this._nextIteration = parseInt(this._properties.getProperty(this._nextIterationPropertyName)) || 1;
  }


  /**
   * Run the trigger function
   */
  run() {
    _longRunTrigger();
  }


  /**
   * Getter for next iteration to run
   * 
   * @returns {number} next iteration index (1 is the first iteration)
   */
  get nextIteration() {
    // save start time
    this._startTime = new Date().getTime();
        
    // if the trigger exists, delete it.
    this._deleteTrigger();

    return this._nextIteration;
  }

  /**
   * Getter for Long Run settings
   * 
   * @returns {Oject}  Settings
   */
  get settings() {
    return this._settings;
  }

  /**
   * Deletes the trigger and associated ID in script properties
   */
  _deleteTrigger() {
    var triggerId = this._properties.getProperty(this._triggerKeyPropertyName);

    if(!triggerId)
      return;

    ScriptApp.getProjectTriggers()
      .filter(function(trigger) {
        return trigger.getUniqueId() == triggerId;
      })
      .forEach(function(trigger) {
        ScriptApp.deleteTrigger(trigger);
      });

    this._properties.deleteProperty(this._triggerKeyPropertyName);
  }


  /**
   * Determines whether the process should be suspended.
   * If it should be suspended, the next trigger and next iteration are registered.
   *
   * @param {number}    nextIteration - start iteration when resuming
   *
   * @returns {boolean}  true - the process should be suspended
   */
  checkSuspend(nextIteration) {  
    const diff = (new Date().getTime() - this._startTime) / 1000;
    
    // If it's past the specified time, suspend the process
    if(diff >= this._settings.maxExecutionSeconds) {
      // register the next iteration in the Script Properties
      this._properties.setProperty(this._nextIterationPropertyName, String(nextIteration)); 
      this._setTrigger();
      return true;
    } 
    return false;
  }

  /**
   * Sets a trigger and register its ID in Script Properties
   */
  _setTrigger() {
    this._deleteTrigger(); // delete if exists.
    
    var dt = new Date();
    dt.setMinutes(dt.getMinutes() + this._settings.delayMinutes); // will execute after the specified time
    var triggerId = ScriptApp.newTrigger(_longRunTrigger.name).timeBased().at(dt).create().getUniqueId();

    // save the trigger id to delete the trigger later.
    this._properties.setProperty(this._triggerKeyPropertyName, triggerId);
  }

  /**
   * Check if the long run has finished or not
   * If there is no further trigger, reset all LonRun script properties
   * 
   * @returns {boolean}  true is finished, false otherwise
   */
  isFinished() {
    if(!this._properties.getProperty(this._triggerKeyPropertyName)) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Resets LongRun script properties and delete trigger if exists
   */
  reset() {
    // delete trigger
    this._deleteTrigger();
    
    // delete script properties
    this._properties.deleteProperty(this._settingsPropertyName);
    this._properties.deleteProperty(this._nextIterationPropertyName);
  }
}


/**
 * The generic Long Run trigger function
 */
function _longRunTrigger() {
  var longRun = new LongRun();
  var settings = longRun.settings;
  
  try {
    // *** call initializer ***
    if (settings.initializer.length) {
      settings.initializer = this[settings.initializer]; //hook code safely
      settings.initializer(settings.args);
    }

    // Execute the iterative process.
    for (var i = longRun.nextIteration; i <= settings.iterations; i++) {
        console.log("  Iteration: "+i);
        // Each time before executing a process, you need to check if it should be stopped or not.
        if (longRun.checkSuspend(i)) {
          // if checkShouldSuspend() returns true, the next trigger has been set
          // and you should get out of the loop.
          Logger.log(`LongRunTriggerFunction: iteration #${i} suspended`);
          break;
        }
        settings.mainProcess = this[settings.mainProcess];
        settings.mainProcess(i, settings.args);
        Logger.log(`LongRunTriggerFunction: iteration #${i} done`);
      }
  }
  catch (e) {
    console.log(`LongRunTriggerFunction exception: ${e.message}`);
  }
  finally {
    // you must always call reset() to reset the long-running variables if there is no next trigger.
    if (longRun.isFinished()) {
      longRun.reset();
      Logger.log(`LongRunTriggerFunction finished (${longRun.iterations} done)`);
      // *** call finalizer ***
      if (settings.finalizer.length) {
        settings.finalizer = this[settings.finalizer]; //hook code safely
        settings.finalizer(settings.iterations, settings.args);
      }
    }
  }
}
