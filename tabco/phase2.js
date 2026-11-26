(() => {
  const ids = ["p2-count", "p2-before", "p2-after", "p2-rate"];
  const inputs = ids.map((id) => document.getElementById(id));
  const output = document.getElementById("p2-output");
  if (!output || inputs.some((input) => !input)) return;

  const format = (value) =>
    new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value);

  function calculate() {
    const [count, before, after, hourlyValue] = inputs.map((input) =>
      Math.max(0, Number(input.value) || 0)
    );
    const savedMinutes = count * Math.max(0, before - after);
    const savedHours = savedMinutes / 60;
    const estimatedValue = savedHours * hourlyValue;

    output.textContent =
      "زمان برآوردی آزادشده: " + format(savedMinutes) +
      " دقیقه در ماه (" + format(savedHours) +
      " ساعت). ارزش زمانی برآوردی: " + format(estimatedValue) +
      " واحد پولی در ماه. این نتیجه فقط به ورودی‌های شما وابسته است و باید با ثبت زمان واقعی سنجیده شود.";
  }

  inputs.forEach((input) => input.addEventListener("input", calculate));
  calculate();
})();
