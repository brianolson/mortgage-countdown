(function(){

function CentRound(dollars) {
  return Math.round(dollars * 100.0) / 100.0;
}

function Payment(interestPerPayment, payments, principal, baloon) {
  var i = interestPerPayment + 1.0;
  var iToTheNth = Math.pow(i, payments);
  return interestPerPayment * (
    ( (principal * iToTheNth) / 
      (iToTheNth - 1.0) ) +
      ( baloon / (i - (iToTheNth * i)) )
  );
}

/**
 *
 * @return {Array.<Object>} [{
 *     'payment':total dollars, 'principalPart':dollars,
 *     'sumPrincipal':dollars so far,
 *     'sumInterest':dollars so far,
 *     'when':Date}]
 */
function CalcPayments(interestPerPayment, payments, principal, baloon, paydate, earlyPrincipal) {
  var out = new Array();
  var sumPrincipal = earlyPrincipal;
  var sumInterest = 0.0;
  var payment = Payment(interestPerPayment, payments, principal, baloon);
  var payment = CentRound(payment);
  var principalPart = 0.0;
  var i = 1;
  while (i < payments) {
    principalPart = (payment - (interestPerPayment * principal)) * Math.pow((1 + interestPerPayment), (i-1));
    if (sumPrincipal + principalPart > principal) {
      break;
    }
    sumPrincipal += principalPart;
    sumInterest += (payment - principalPart);
    var x = new Object();
    x.payment = payment;
    x.principalPart = principalPart;
    x.sumPrincipal = sumPrincipal;
    x.sumInterest = sumInterest;
    x.when = paydate;
    out.push(x);
    var year = paydate.getFullYear();
    var month = paydate.getMonth();
    var day = paydate.getDate();
    month++;
    if (month >= 12) {
      year++;
      month -= 12;
    }
    paydate = new Date(year, month, day);
    i++;
  }
  principalPart = (payment - (interestPerPayment * principal)) * Math.pow((1 + interestPerPayment), (i-1));
  var interestPart = payment - principalPart;
  principalPart = principal - (sumPrincipal + earlyPrincipal);
  payment = interestPart + principalPart;
  sumPrincipal += principalPart;
  sumInterest += interestPart;
  x = new Object();
  x.payment = payment;
  x.principalPart = principalPart;
  x.sumPrincipal = sumPrincipal;
  x.sumInterest = sumInterest;
  x.when = paydate;
  out.push(x);
  return out;
}

function getContinuousSumPrincipal(payments, now, prepaydate) {
  var ttotal = 0.0;
  if (now < payments[0].when) {
    ttotal = payments[0].sumPrincipal * (now - prepaydate) / (payments[0].when - prepaydate);
  } else {
    var i = 0;
    i = 0;
    while (i < payments.length) {
      if ( now < payments[i].when ) {
	break;
      }
      i++;
    }
    if ( i == payments.length ) {
      // Done!
      ttotal = payments[i-1].sumPrincipal;
    } else {
      // now is between payments[i-1] and payments[i]
      var nextportion = (now - payments[i-1].when) / (payments[i].when - payments[i-1].when);
      ttotal = nextportion * payments[i].sumPrincipal;
      ttotal += (1 - nextportion) * payments[i-1].sumPrincipal;
    }
  }
  return ttotal;
}

// payment: {payment, principalPart, sumPrincipal, sumInterest, when}
var payments = null;
var params = {};

function setup(percentout) {
  params.totalcost = parseFloat(percentout.getAttribute("data-totalcost"));
  params.prepaydate = new Date(percentout.getAttribute("data-prepaydate"));
  params.firstpayment = new Date(percentout.getAttribute("data-firstpayment"));
  params.earlyPrincipal = parseFloat(percentout.getAttribute("data-earlyprincipal"));
  params.interest = parseFloat(percentout.getAttribute("data-interest"));
  params.years = parseInt(percentout.getAttribute("data-years"));
  params.numPayments = params.years*12;
  params.principal = parseFloat(percentout.getAttribute("data-principal"));
  params.setTitle = JSON.parse(percentout.getAttribute("data-settitle"));
  payments = CalcPayments(params.interest / 12.0, params.numPayments, params.principal, 0, params.firstpayment, params.earlyPrincipal);
}

var secondsperyear = 31556926; // according to units

function dtString(dt) {
  var years = 0;
  if (dt > secondsperyear) {
    years = Math.floor(dt / secondsperyear);
    dt -= years * secondsperyear;
  }
  var seconds = dt % 60;
  dt = Math.floor((dt - seconds) / 60);
  seconds = (new Number(seconds)).toFixed(3);
  var minutes = dt % 60;
  dt = Math.floor((dt - minutes) / 60);
  var hours = dt % 24;
  var days = Math.floor((dt - hours) / 24);
  if (years > 0) {
    return '' + years + ' years, ' + days + ' days, ' + hours + ' hours, ' + minutes + ' minutes and ' + seconds + ' seconds';
  } else if (days > 0) {
    return '' + days + ' days, ' + hours + ' hours, ' + minutes + ' minutes and ' + seconds + ' seconds';
  } else if (hours > 0) {
    return '' + hours + ' hours, ' + minutes + ' minutes and ' + seconds + ' seconds';
  } else if (minutes > 0) {
    return '' + minutes + ' minutes and ' + seconds + ' seconds';
  } else {
    return '' + seconds + ' seconds';
  }
}

function formatNum(x) {
  return (new Number(x)).toFixed(6);
}
function pointTwo(x) {
  return (new Number(x)).toFixed(2);
}

function getNextPayment(now) {
  var i = 0;
  var nextp = payments[0];
  while (now > payments[i].when) {
    nextp = payments[i+1];
    i++;
  }
  return nextp;
}

function dodetails(ttotal, destelem, now) {
  var nextPayment = getNextPayment(now);
  var npstring = '';
  if (nextPayment) {
    npstring = 'next payment is $' + pointTwo(nextPayment.principalPart) +
      ' principal, $' + pointTwo(nextPayment.payment - nextPayment.principalPart) +
      ' interest, at ' + nextPayment.when.toString() + '<br>';
  }
  var lastPayment = payments[payments.length - 1];
  var dt = (lastPayment.when.getTime() - now.getTime()) / 1000;
  var amountpaid = params.totalcost - params.principal;
  destelem.innerHTML = npstring + 'paid $' + formatNum(ttotal) +
    ' remaining $' + formatNum(params.principal - ttotal) +
    ' of $' + params.principal +
    ' loan principal<br>paid $' + formatNum(amountpaid + ttotal) +
    ' remaining $' + formatNum(params.totalcost - (amountpaid + ttotal)) +
    ' of total cost $' + params.totalcost +
    '<br>' + dtString(dt) + ' until done (at ' +
    lastPayment.when.toString() + ')';
}

function doit(now, pd, details) {
  if (payments == null) {
    setup(pd);
  }
  var ttotal = getContinuousSumPrincipal(payments, now, params.prepaydate);
  var pct = (params.totalcost - params.principal + ttotal) / params.totalcost;
  var pctstr = (pct * 100.0).toString().substring(0,10) + '%';
  if (pd) {
    pd.innerHTML = pctstr;
  }
  if (params.setTitle) {
    document.title = pctstr;
  }
  if (details) {
    dodetails(ttotal, details, now);
  }
}

var updatePercent = function() {
  var pd = document.getElementById('percentout');
  var details = document.getElementById('details');
  var now = new Date();
  doit(now, pd, details);
  setTimeout(updatePercent, 250);
}

function timeTillTarget(payments, now, prepaydate, targetpct) {
  var ttotal = getContinuousSumPrincipal(payments, now, prepaydate);
  var pct = (amountpaid + ttotal) / totalcost;
  if (pct > targetpct) { return 'passed'; }
}

updatePercent();

}())
