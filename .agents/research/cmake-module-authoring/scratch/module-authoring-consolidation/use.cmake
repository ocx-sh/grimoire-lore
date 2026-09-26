argn_fn(NAME foo COMMAND tool --project "${toml}" lock --check --and-a-very-long-flag-to-force-wrapping --another-one)
parseargv_fn(NAME foo COMMAND tool --project "${toml}" lock --check --and-a-very-long-flag-to-force-wrapping --another-one)
parseargv_nohint_fn(NAME foo COMMAND tool --project "${toml}" lock --check --and-a-very-long-flag-to-force-wrapping --another-one)
