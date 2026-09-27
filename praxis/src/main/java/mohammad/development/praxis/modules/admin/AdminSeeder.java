package mohammad.development.praxis.modules.admin;

import lombok.RequiredArgsConstructor;
import mohammad.development.praxis.repos.AdminRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@RequiredArgsConstructor
public class AdminSeeder implements CommandLineRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.default-password}")
    private String adminDefaultPassword;

    @Override
    public void run(String... args) {
        if (adminRepository.existsByUsername("admin")) return;

        Admin admin = new Admin();
        admin.setUsername("admin");
        admin.setPasswordHash(passwordEncoder.encode(adminDefaultPassword));
        admin.setRoles(Set.of("ADMIN"));
        admin.setEnabled(true);

        try {
            adminRepository.insert(admin);
            System.out.println("Seeded initial admin user: admin");
        } catch (DuplicateKeyException ignored) {
            // Another replica inserted the admin after our existence check.
        }
    }
}
