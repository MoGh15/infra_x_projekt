package mohammad.development.praxis.modules.admin;

import mohammad.development.praxis.repos.AdminRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminSeederTest {

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AdminSeeder adminSeeder;

    @BeforeEach
    void setUp() {
        adminSeeder = new AdminSeeder(adminRepository, passwordEncoder);
    }

    @Test
    void run_noExistingAdmins_createsAdmin() throws Exception {
        when(adminRepository.count()).thenReturn(0L);
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");

        adminSeeder.run();

        ArgumentCaptor<Admin> adminCaptor = ArgumentCaptor.forClass(Admin.class);
        verify(adminRepository).save(adminCaptor.capture());

        Admin savedAdmin = adminCaptor.getValue();
        assertEquals("admin", savedAdmin.getUsername());
        assertEquals("encoded-password", savedAdmin.getPasswordHash());
        assertTrue(savedAdmin.getRoles().contains("ADMIN"));
        assertTrue(savedAdmin.isEnabled());
    }

    @Test
    void run_existingAdmins_doesNotCreateAdmin() throws Exception {
        when(adminRepository.count()).thenReturn(1L);

        adminSeeder.run();

        verify(adminRepository, never()).save(any(Admin.class));
    }

    @Test
    void run_multipleExistingAdmins_doesNotCreateAdmin() throws Exception {
        when(adminRepository.count()).thenReturn(5L);

        adminSeeder.run();

        verify(adminRepository, never()).save(any(Admin.class));
    }

    @Test
    void run_withArgs_ignoresArgs() throws Exception {
        when(adminRepository.count()).thenReturn(0L);
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");

        adminSeeder.run("arg1", "arg2", "arg3");

        verify(adminRepository).save(any(Admin.class));
    }
}

