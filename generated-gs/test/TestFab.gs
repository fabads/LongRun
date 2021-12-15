function testLongRun() {
  var longRun = new PlanningIntegration.LongRun({iterations: 3, maxExecutionSeconds: 1, delayMinutes: 1, 
    initializer: 'myInitFunction', mainProcess: 'myMainFunction', finalizer: 'myFinalizerFunction', args: { myArg1: 'myArg1Value'}});
  
  longRun.run();
}


function myInitFunction(args) {
  console.log('*** In Initializer function ***');
  console.log('  Arguments: ');
  console.log(args);
  Utilities.sleep(1000);
  console.log('*** End of initializer function ***');
}


function myMainFunction(iteration, args) {
  console.log(`*** In my main function (iteration ${iteration}) ...processing ***`);
  console.log(`    Arguments:`);
  console.log(args);
  Utilities.sleep(1000);
  console.log('*** End of main function');
}

function myFinalizerFunction(iterations, args) {
  console.log(`*** In finalizer function (${iterations} performed) ***`);
  console.log('    Arguments:');
  console.log(args);
  console.log('*** End of finalizer function***');
}
