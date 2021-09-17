function round(x, decimal_places)
{
  if (decimal_places === undefined) {
    decimal_places = 2;
  }
  var n = Math.pow(10, decimal_places);
  return Math.round(x * n) / n;
}

function calculate() {
  var price = Number(document.getElementsByName("price")[0].value);
  var rent = Number(document.getElementsByName("rent")[0].value);

  var expense = Number(document.getElementsByName("expense")[0].value);
  var closing = Number(document.getElementsByName("closing")[0].value);
  var rate = Number(document.getElementsByName("rate")[0].value);


  var numerator = rent - expense
  var denominator = price + closing
  var offset = rate;

  console.log(numerator);
  console.log(denominator);
  console.log(rate);
  

  var score = round( numerator / denominator - offset, 1 );
  console.log(score);

  var out_element = document.getElementsByName('output')[0];
  out_element.innerHTML = "Score = <b><big>" + String(score) + "</big></b>";
}
