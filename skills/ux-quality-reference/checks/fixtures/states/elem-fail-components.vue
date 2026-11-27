<template>
  <form>
    <VInput v-model="email" type="email" />
    <!-- the password wrapper defaults to off -->
    <PasswordInput bind:value={password} />
    <input
      class="plain"
      name="username"
    />
    <VInput
      :rules="{ min: { n: 3 } }"
      type="tel"
    />
  </form>
</template>
