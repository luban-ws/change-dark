use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process;
use std::thread;
use theme_dsl::{parse_theme_profiles, SiteProfileV1};

fn collect_theme_files(dir: &Path, out: &mut Vec<PathBuf>) -> Result<(), String> {
    let entries = fs::read_dir(dir)
        .map_err(|e| format!("failed to read directory `{}`: {e}", dir.display()))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("failed to read directory entry: {e}"))?;
        let path = entry.path();
        if path.is_dir() {
            collect_theme_files(&path, out)?;
        } else if path.extension().and_then(|s| s.to_str()) == Some("theme") {
            out.push(path);
        }
    }
    Ok(())
}

fn validate_directory(input_dir: &Path) -> Result<(usize, usize), String> {
    let mut files = Vec::new();
    collect_theme_files(input_dir, &mut files)?;
    files.sort();
    if files.is_empty() {
        return Err(format!(
            "no `.theme` files found in `{}`",
            input_dir.display()
        ));
    }
    let file_count = files.len();

    let worker_count = thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .min(file_count)
        .max(1);
    let chunk_size = file_count.div_ceil(worker_count);

    let chunk_results: Vec<Result<Vec<(PathBuf, Vec<SiteProfileV1>)>, String>> =
        thread::scope(|scope| {
            let mut handles = Vec::new();
            for chunk in files.chunks(chunk_size) {
                handles.push(scope.spawn(move || {
                    let mut parsed = Vec::with_capacity(chunk.len());
                    for path in chunk {
                        let source = fs::read_to_string(path).map_err(|e| {
                            format!("failed to read `{}`: {e}", path.display())
                        })?;
                        let profiles = parse_theme_profiles(&source).map_err(|e| {
                            format!("{}:{}:{}: {}", path.display(), e.line, e.column, e.message)
                        })?;
                        parsed.push((path.clone(), profiles));
                    }
                    Ok(parsed)
                }));
            }
            handles
                .into_iter()
                .map(|h| {
                    h.join().unwrap_or_else(|_| {
                        Err("theme validator worker thread panicked".to_string())
                    })
                })
                .collect()
        });

    let mut seen_ids: HashMap<String, PathBuf> = HashMap::new();
    let mut profile_count = 0usize;
    for chunk_res in chunk_results {
        for (path, profiles) in chunk_res? {
            for profile in profiles {
                if let Some(prev_path) = seen_ids.get(&profile.id) {
                    return Err(format!(
                        "duplicate profile id `{}` found in `{}` and `{}`",
                        profile.id,
                        prev_path.display(),
                        path.display()
                    ));
                }
                seen_ids.insert(profile.id, path.clone());
                profile_count += 1;
            }
        }
    }

    Ok((profile_count, file_count))
}

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.len() != 1 || args[0] == "--help" || args[0] == "-h" {
        eprintln!("Usage: theme-dsl-check <input-dir>");
        process::exit(if args.len() == 1 && (args[0] == "--help" || args[0] == "-h") {
            0
        } else {
            2
        });
    }

    match validate_directory(Path::new(&args[0])) {
        Ok((profiles, files)) => {
            println!("Validated {profiles} theme profile(s) across {files} .theme file(s)");
        }
        Err(err) => {
            eprintln!("theme-dsl-check error: {err}");
            process::exit(1);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn make_temp_dir(label: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = env::temp_dir().join(format!("theme-dsl-check-test-{label}-{nanos}"));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn validates_directory_in_parallel() {
        let dir = make_temp_dir("ok");
        fs::write(
            dir.join("z.theme"),
            "profile \"z-site\" { match { hostEquals [\"z.example\"] } }\n",
        )
        .unwrap();
        fs::write(
            dir.join("a.theme"),
            "profile \"a-site\" { match { hostEquals [\"a.example\"] } }\n",
        )
        .unwrap();

        let (profiles, files) = validate_directory(&dir).expect("validate dir");
        assert_eq!(profiles, 2);
        assert_eq!(files, 2);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn rejects_duplicate_ids_across_files() {
        let dir = make_temp_dir("dup");
        fs::write(
            dir.join("one.theme"),
            "profile \"shared-id\" { match { hostEquals [\"one.example\"] } }\n",
        )
        .unwrap();
        fs::write(
            dir.join("two.theme"),
            "profile \"shared-id\" { match { hostEquals [\"two.example\"] } }\n",
        )
        .unwrap();

        let err = validate_directory(&dir).unwrap_err();
        assert!(err.contains("duplicate profile id `shared-id`"));

        let _ = fs::remove_dir_all(&dir);
    }
}
