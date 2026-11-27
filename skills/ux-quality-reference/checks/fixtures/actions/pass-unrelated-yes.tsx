// Clean twin: a Yes option in a survey form.
export const Survey = () => (
  <fieldset>
    <legend>Did the page help?</legend>
    <label><input type="radio" name="helped" value="Yes" /> Yes</label>
    <label><input type="radio" name="helped" value="No" /> No</label>
  </fieldset>
);
