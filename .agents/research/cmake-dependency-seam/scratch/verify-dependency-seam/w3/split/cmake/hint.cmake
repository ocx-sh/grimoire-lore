function(hint name dir)
  set(${name}_ROOT "${dir}"
    CACHE PATH "hint" FORCE)
endfunction()
