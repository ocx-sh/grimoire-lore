<template>
  <form>
    <label for="email">Email</label>
    <input id="email" type="email" />
    <VInput label="Display name" v-model="displayName" />
    <label class="field">Phone <input type="tel" /></label>
    <input type="hidden" name="csrf" />
    <input type="submit" value="Save" />
  </form>
</template>
