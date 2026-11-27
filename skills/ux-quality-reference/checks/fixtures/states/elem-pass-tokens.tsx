export function Form() {
  return (
    <form>
      <input type="email" autoComplete="email" />
      <Input name="username" autocomplete="username" />
      <input type="text" name="search" />
      <PasswordInput autoComplete="current-password" />
    </form>
  );
}
