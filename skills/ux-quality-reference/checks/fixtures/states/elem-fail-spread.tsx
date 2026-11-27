export function Form({ control }) {
  return (
    <Controller name="email" control={control} render={({ field }) => (
      <Input {...field} />
    )} />
  );
}
