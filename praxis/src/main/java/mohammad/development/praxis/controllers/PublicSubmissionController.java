package mohammad.development.praxis.controllers;

import mohammad.development.praxis.DTOs.SubmissionCreateRequest;
import mohammad.development.praxis.modules.admin.SseHub;
import mohammad.development.praxis.modules.patient.Submission;
import mohammad.development.praxis.modules.patient.SubmissionStatus;
import mohammad.development.praxis.modules.patient.SubmissionAttachment;
import mohammad.development.praxis.modules.patient.Signature;
import mohammad.development.praxis.repos.SubmissionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.bson.types.ObjectId;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/submissions")
public class PublicSubmissionController {
    private SseHub hub;

    private final SubmissionRepository submissionRepository;
    private final GridFsTemplate gridFsTemplate;

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    private static final int MAX_FILES = 5;
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    public PublicSubmissionController(
            SseHub hub,
            SubmissionRepository submissionRepository,
            GridFsTemplate gridFsTemplate
    ) {
        this.hub = hub;
        this.submissionRepository = submissionRepository;
        this.gridFsTemplate = gridFsTemplate;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Submission submit(@RequestBody SubmissionCreateRequest req) {
        validateSignature(req.getSignature());
        Submission sAfterSave = submissionRepository.save(buildSubmission(req));
        hub.sendCreated(sAfterSave);
        return sAfterSave;

    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Submission submitWithFiles(
            @RequestPart("payload") SubmissionCreateRequest req,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {
        validateSignature(req.getSignature());
        validateFiles(files);

        Submission sAfterSave = submissionRepository.save(buildSubmission(req));
        if (files == null || files.isEmpty()) {
            hub.sendCreated(sAfterSave);
            return sAfterSave;
        }

        List<SubmissionAttachment> attachments = new ArrayList<>();
        try {
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) {
                    continue;
                }

                ObjectId storedId = gridFsTemplate.store(
                        file.getInputStream(),
                        file.getOriginalFilename(),
                        file.getContentType(),
                        new org.bson.Document("submissionId", sAfterSave.getId())
                );

                SubmissionAttachment attachment = new SubmissionAttachment();
                attachment.setId(storedId.toHexString());
                attachment.setFileName(file.getOriginalFilename());
                attachment.setContentType(file.getContentType());
                attachment.setSize(file.getSize());
                attachment.setUploadedAt(Instant.now());
                attachments.add(attachment);
            }
        } catch (Exception ex) {
            cleanupFiles(attachments);
            submissionRepository.deleteById(sAfterSave.getId());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File upload failed");
        }

        sAfterSave.setAttachments(attachments);
        sAfterSave = submissionRepository.save(sAfterSave);
        hub.sendCreated(sAfterSave);
        return sAfterSave;
    }

    private Submission buildSubmission(SubmissionCreateRequest req) {
        Submission s = new Submission();
        s.setStatus(SubmissionStatus.NEW);
        s.setFormVersion(req.getFormVersion() != null ? req.getFormVersion() : "v1");
        s.setPatientData(req.getPatientData());
        s.setMedical(req.getMedical());
        s.setConsents(req.getConsents());
        s.setSignature(req.getSignature());
        s.setMeta(req.getMeta());
        return s;
    }

    private void validateFiles(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) return;
        if (files.size() > MAX_FILES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Too many files");
        }
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file");
            }
            if (file.getSize() > MAX_FILE_SIZE_BYTES) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File too large");
            }
            String contentType = file.getContentType();
            if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported file type");
            }
        }
    }

    private void validateSignature(Signature signature) {
        if (signature == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Signature required");
        }
        if (signature.getContentType() == null || signature.getContentType().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Signature contentType required");
        }
        if (signature.getBase64() == null || signature.getBase64().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Signature data required");
        }
    }

    private void cleanupFiles(List<SubmissionAttachment> attachments) {
        for (SubmissionAttachment attachment : attachments) {
            try {
                gridFsTemplate.delete(Query.query(Criteria.where("_id").is(new ObjectId(attachment.getId()))));
            } catch (Exception ignored) {
            }
        }
    }
}
